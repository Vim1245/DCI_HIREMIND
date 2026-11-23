"""
Supabase Storage Service - DCI HireMind
Manages candidate resume uploads, secure downloads, and signed URL generation.
Does NOT attempt unauthorized bucket creation using the anon key.
"""

import logging
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException, UploadFile, status
from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("dci_hiremind.storage")
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


class SupabaseStorageService:
    """Enterprise service interfacing with Supabase Storage for resumes."""

    def __init__(self):
        self.bucket_name = settings.SUPABASE_STORAGE_BUCKET_RESUMES
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazy-loaded Supabase client using public anon key."""
        if self._client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
                raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured.")
            self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        return self._client

    def check_storage_status(self) -> Tuple[bool, Dict[str, Any]]:
        """
        Inspects Supabase Storage connectivity and checks if the 'resumes' bucket exists.
        Does NOT attempt unauthorized bucket creation using the anon key.
        Returns:
            (is_ready, diagnostics)
        """
        diagnostics: Dict[str, Any] = {
            "target_bucket": self.bucket_name,
            "supabase_url": settings.SUPABASE_URL,
            "project_ref": settings.SUPABASE_PROJECT_REF,
        }

        try:
            buckets = self.client.storage.list_buckets()
            bucket_names = [b.name for b in buckets] if buckets else []
            diagnostics["available_buckets"] = bucket_names
            diagnostics["api_connection"] = "connected"

            if self.bucket_name in bucket_names:
                diagnostics["bucket_status"] = "ready"
                diagnostics["message"] = f"Storage bucket '{self.bucket_name}' is active and ready."
                return True, diagnostics
            else:
                diagnostics["bucket_status"] = "missing"
                diagnostics["message"] = (
                    f"Storage bucket '{self.bucket_name}' does not exist yet. "
                    "Please create a private bucket named 'resumes' in the Supabase Dashboard under Storage -> New bucket."
                )
                return False, diagnostics
        except Exception as e:
            diagnostics["api_connection"] = "error"
            diagnostics["bucket_status"] = "unreachable"
            diagnostics["error"] = str(e)
            return False, diagnostics

    def validate_file(self, filename: str, content_type: Optional[str], file_size: int) -> None:
        """Validates file extension, MIME type, and size."""
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension '{suffix}'. Allowed: {list(ALLOWED_EXTENSIONS)}",
            )
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid content type '{content_type}'. Must be PDF or DOCX.",
            )
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
            )

    async def upload_resume(
        self,
        candidate_id: int,
        file: UploadFile,
    ) -> Dict[str, Any]:
        """
        Uploads a resume to Supabase Storage in an isolated candidate folder.
        Returns storage path and metadata.
        """
        is_ready, diag = self.check_storage_status()
        if not is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=diag.get("message", "Supabase storage is not ready."),
            )

        content = await file.read()
        file_size = len(content)
        filename = file.filename or "resume.pdf"
        self.validate_file(filename, file.content_type, file_size)

        ext = Path(filename).suffix.lower()
        unique_id = uuid.uuid4().hex[:12]
        storage_path = f"candidates/{candidate_id}/{unique_id}{ext}"

        try:
            self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )
            logger.info(f"Uploaded resume to Supabase Storage: {storage_path}")
            return {
                "success": True,
                "file_name": filename,
                "storage_path": storage_path,
                "file_type": ext.lstrip("."),
                "file_size_bytes": file_size,
            }
        except Exception as e:
            logger.error(f"Failed to upload resume to Supabase Storage: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to upload file to storage: {str(e)}",
            )

    def get_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """
        Generates a secure, temporary signed URL (default 1 hour)
        to read a private resume without making the bucket public.
        """
        try:
            res = self.client.storage.from_(self.bucket_name).create_signed_url(
                path=storage_path, expires_in=expires_in
            )
            return res.get("signedURL") or res.get("signedUrl")
        except Exception as e:
            logger.error(f"Failed to create signed URL for '{storage_path}': {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to generate signed document URL: {str(e)}",
            )

    def download_resume(self, storage_path: str) -> bytes:
        """Downloads resume bytes directly from storage."""
        try:
            return self.client.storage.from_(self.bucket_name).download(storage_path)
        except Exception as e:
            logger.error(f"Failed to download resume '{storage_path}': {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume document not found in storage.",
            )

    def delete_resume(self, storage_path: str) -> bool:
        """Deletes a resume file from storage."""
        try:
            self.client.storage.from_(self.bucket_name).remove([storage_path])
            return True
        except Exception as e:
            logger.error(f"Failed to delete resume '{storage_path}': {e}")
            return False


# Singleton instance
storage_service = SupabaseStorageService()
