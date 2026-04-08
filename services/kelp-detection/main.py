"""
Kelp Detection Pipeline — CLI entry point.

Usage:
    python main.py                  # Run full pipeline
    python main.py --dry-run        # Search scenes but don't process
    python main.py --days 30        # Look back 30 days
    python main.py --max-cloud 10   # Only scenes with <10% cloud
    python main.py --verbose        # Debug logging

Deploy as a cron job (every 12 hours recommended):
    Railway: python main.py
    Docker:  docker run kelp-detection python main.py
"""
import os
import sys
import argparse
import logging
from pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser(description='Kelp paddy detection from Sentinel-2 imagery')
    parser.add_argument('--dry-run', action='store_true',
                        help='Search for scenes but do not download or process')
    parser.add_argument('--days', type=int, default=10,
                        help='How many days back to search (default: 10)')
    parser.add_argument('--max-cloud', type=float, default=20.0,
                        help='Maximum cloud cover %% (default: 20)')
    parser.add_argument('--max-scenes', type=int, default=50,
                        help='Maximum scenes to process per run (default: 50)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Enable debug logging')
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    log = logging.getLogger('kelp-detection')

    # Check for Copernicus auth (either username/password or client_id/secret)
    has_user_auth = os.environ.get('COPERNICUS_USERNAME') and os.environ.get('COPERNICUS_PASSWORD')
    has_client_auth = os.environ.get('COPERNICUS_CLIENT_ID') and os.environ.get('COPERNICUS_CLIENT_SECRET')
    if not has_user_auth and not has_client_auth:
        log.error('Missing Copernicus credentials. Set either:')
        log.error('  COPERNICUS_USERNAME + COPERNICUS_PASSWORD (full access)')
        log.error('  COPERNICUS_CLIENT_ID + COPERNICUS_CLIENT_SECRET (search only)')
        sys.exit(1)

    required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        log.error(f'Missing env vars: {", ".join(missing)}')
        sys.exit(1)

    log.info('Starting kelp detection pipeline...')
    log.info(f'Config: days_back={args.days}, max_cloud={args.max_cloud}%, '
             f'max_scenes={args.max_scenes}, dry_run={args.dry_run}')

    try:
        result = run_pipeline(
            days_back=args.days,
            max_cloud=args.max_cloud,
            max_scenes=args.max_scenes,
            dry_run=args.dry_run,
        )
        log.info(f'Result: {result}')
    except Exception as e:
        log.error(f'Pipeline failed: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
