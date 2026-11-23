from app.database.session import engine
from sqlalchemy import text

statements = [
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'buckets' AND policyname = 'Public read resumes bucket'
        ) THEN
            CREATE POLICY "Public read resumes bucket" ON storage.buckets FOR SELECT USING (id = 'resumes');
        END IF;
    END $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow resume select'
        ) THEN
            CREATE POLICY "Allow resume select" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');
        END IF;
    END $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow resume insert'
        ) THEN
            CREATE POLICY "Allow resume insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');
        END IF;
    END $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow resume update'
        ) THEN
            CREATE POLICY "Allow resume update" ON storage.objects FOR UPDATE USING (bucket_id = 'resumes');
        END IF;
    END $$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow resume delete'
        ) THEN
            CREATE POLICY "Allow resume delete" ON storage.objects FOR DELETE USING (bucket_id = 'resumes');
        END IF;
    END $$;
    """
]

with engine.connect() as conn:
    for stmt in statements:
        conn.execute(text(stmt))
    conn.commit()
    print("Storage policies executed successfully.")

