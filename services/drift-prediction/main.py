"""Drift Prediction Pipeline — entry point. Runs once then exits."""
import os
import sys
import logging
from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('drift-prediction')

def main():
    required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        log.error(f'Missing env vars: {", ".join(missing)}')
        sys.exit(1)

    log.info('Starting drift prediction pipeline...')
    try:
        result = run_pipeline()
        log.info(f'Pipeline complete: {result}')
    except Exception as e:
        log.error(f'Pipeline failed: {e}', exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
