import sys
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


async def init_db():
    """Initialize database with default admin user (tables created by alembic)."""
    print("init_db: Starting database initialization...", flush=True)
    
    try:
        async with AsyncSessionLocal() as db:
            # Check if users table exists first
            try:
                result = await db.execute(select(User).limit(1))
                existing_user = result.scalar_one_or_none()
                print(f"init_db: Query successful, existing_user={existing_user}", flush=True)
            except Exception as e:
                # Table doesn't exist yet - migrations haven't run
                print(f"init_db: Users table not found - run 'alembic upgrade head' first. Error: {e}", flush=True)
                return
            
            if existing_user is None:
                # Create default admin user
                print(f"init_db: Creating admin user with email: {settings.DEFAULT_ADMIN_EMAIL}", flush=True)
                admin_user = User(
                    email=settings.DEFAULT_ADMIN_EMAIL,
                    password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                    full_name="Administrator",
                    role="admin",
                    is_active=True,
                )
                db.add(admin_user)
                await db.commit()
                print(f"init_db: Created default admin user: {settings.DEFAULT_ADMIN_EMAIL}", flush=True)
            else:
                print(f"init_db: Database already initialized, existing user: {existing_user.email}", flush=True)
    except Exception as e:
        print(f"init_db: ERROR - {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
