# backend/ssbs/settings.py
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # must be called before any os.environ.get()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Vault Integration — secrets from HashiCorp Vault (fallback to env vars)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
from ssbs.vault import get_secret

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = get_secret('django', 'secret_key', os.environ.get('SECRET_KEY'))
# Prioritize environment variable for DEBUG during dev
DEBUG_ENV = os.environ.get('APP_DEBUG', os.environ.get('DEBUG', 'False'))
DEBUG = str(DEBUG_ENV).lower() in ['true', '1', 'yes', 't']

ALLOWED_HOSTS_ENV = get_secret('django', 'allowed_hosts', os.environ.get('ALLOWED_HOSTS', '*'))
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',')] if ALLOWED_HOSTS_ENV != '*' else ['*']

AUTH_USER_MODEL = 'users.User'  # required — custom user model

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'apps.users',
    'apps.stations',
    'apps.buses',
    'apps.routes',
    'apps.drivers',
    'apps.trips',
    'apps.reservations',
    'apps.reports',
    'apps.announcements',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # must be first
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves collected static files (Django admin, DRF/Spectacular
    # UI) directly from gunicorn in production, so no separate static server
    # is needed. Must sit right after SecurityMiddleware. Harmless in dev.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'ssbs.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ssbs.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_secret('database', 'name', os.environ.get('POSTGRES_DB')),
        'USER': get_secret('database', 'user', os.environ.get('POSTGRES_USER')),
        'PASSWORD': get_secret('database', 'password', os.environ.get('POSTGRES_PASSWORD')),
        'HOST': get_secret('database', 'host', os.environ.get('DB_HOST', 'db')),
        'PORT': get_secret('database', 'port', os.environ.get('DB_PORT', '5432')),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

USE_TZ = True
TIME_ZONE = 'Africa/Casablanca'

USE_I18N = True

STATIC_URL = 'static/'
# Target for `collectstatic`, run by the backend entrypoint in production so
# gunicorn+WhiteNoise can serve admin/DRF assets. Unused by runserver in dev.
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    'https://localhost:8443',
]
# Required so the browser sends/accepts the refresh-token cookie on
# cross-origin requests (e.g. frontend dev server on :5173 talking to the
# backend directly on :8000, outside the WAF). Safe alongside an explicit
# CORS_ALLOWED_ORIGINS allowlist (never paired with "allow all").
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    # App default: an authenticated (JWT) session. The public API key is NOT a
    # global gate — it is applied deliberately to the documented public
    # endpoints via HasAPIKeyOrIsAuthenticated (see docs/PUBLIC_API.md).
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        # Session upkeep, not open API browsing: the SPA refreshes its
        # access token on every full page load, and the request carries no
        # Authorization header (the credential is the HttpOnly cookie), so
        # it counts as anonymous. Sharing the 100/hour anon budget meant a
        # normal browsing session could rate-limit itself out of the app.
        # The endpoint is useless without a valid refresh cookie, so a
        # higher ceiling costs nothing and still caps abuse.
        'token_refresh': '600/hour',
    },
    # Behind the WAF every request arrives from the proxy, so REMOTE_ADDR is
    # the same container IP for everyone. Telling DRF exactly one proxy sits
    # in front makes it take the client IP that nginx itself appended to
    # X-Forwarded-For. Without this DRF keys the throttle on the *whole*
    # X-Forwarded-For string, which the client controls — so anyone could
    # mint a fresh rate-limit bucket per request just by varying the header
    # and bypass throttling entirely.
    'NUM_PROXIES': 1,
    'EXCEPTION_HANDLER': 'apps.core.exception_handler.api_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'SSBS Public API',
    'DESCRIPTION': 'Public API for interacting with the database externally',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ──────────────────────────────────────────────────────────────────────────────
# 42 Intra OAuth
# ──────────────────────────────────────────────────────────────────────────────
INTRA_42_CLIENT_ID = get_secret('oauth42', 'client_id', os.environ.get('INTRA_42_CLIENT_ID', ''))
INTRA_42_CLIENT_SECRET = get_secret('oauth42', 'client_secret', os.environ.get('INTRA_42_CLIENT_SECRET', ''))
INTRA_42_REDIRECT_URI = get_secret(
    'oauth42', 'redirect_uri',
    os.environ.get('INTRA_42_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/42/callback/'),
)
ADMIN_42_LOGIN = get_secret('oauth42', 'admin_login', os.environ.get('ADMIN_42_LOGIN', ''))

# ──────────────────────────────────────────────────────────────────────────────
# Security hardening (behind WAF/reverse proxy)
# ──────────────────────────────────────────────────────────────────────────────
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# ──────────────────────────────────────────────────────────────────────────────
# Public API Key
# ──────────────────────────────────────────────────────────────────────────────
SSBS_API_KEY = get_secret('api', 'key', os.environ.get('SSBS_API_KEY', ''))

# ──────────────────────────────────────────────────────────────────────────────
# Production hardening — gated on DEBUG so local/eval runs (APP_DEBUG=true)
# behave exactly as before. Set APP_DEBUG=false for a real deployment to
# turn these on; the WAF already sends X-Forwarded-Proto (see
# SECURE_PROXY_SSL_HEADER above) so SECURE_SSL_REDIRECT won't loop.
# ──────────────────────────────────────────────────────────────────────────────
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────
LOG_DIR = '/var/log/ssbs'
os.makedirs(LOG_DIR, exist_ok=True)  # ensure directory exists at startup

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'standard': {
            'format': '{asctime} [{levelname}] {name}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },

    'handlers': {
        # Keep printing to stdout so `docker compose logs backend` still works
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        # Write to a rotating file — max 10 MB per file, keep 5 backups
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': f'{LOG_DIR}/backend.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'standard',
            'encoding': 'utf-8',
        },
    },

    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',  # only warnings+ from third-party libs by default
    },

    'loggers': {
        # All HTTP requests (GET, POST, errors, 500s)
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        # Security-related events (bad tokens, permission denied)
        'django.security': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': False,
        },
        # Our application code (views, management commands)
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        # Cron command specifically
        'archive_trips': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
