#!/usr/bin/env python3
"""
Generate a report of users and their page view counts from Google Analytics 4.

Requirements:
    pip install google-analytics-data pandas

Setup:
    1. Enable the Google Analytics Data API in Google Cloud Console
    2. Create a service account or use OAuth credentials
    3. Set the environment variable:
       - For service account: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
       - Or use OAuth (will prompt for login)
    4. Get your GA4 Property ID from GA4 Admin -> Property Settings
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional

try:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
        FilterExpression,
        Filter,
    )
    import pandas as pd
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install google-analytics-data pandas")
    sys.exit(1)


def get_user_pageviews_report(
    property_id: str,
    days_back: int = 30,
    output_file: Optional[str] = None,
) -> pd.DataFrame:
    """
    Get a report of users and their page view counts.

    Args:
        property_id: Your GA4 Property ID (format: "123456789")
        days_back: Number of days to look back (default: 30)
        output_file: Optional path to save CSV output

    Returns:
        DataFrame with columns: user_id, username, pageviews, sessions
    """
    client = BetaAnalyticsDataClient()

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    print(f"Fetching data from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[
            Dimension(name="userId"),  # This will have your "subject|username" format
            # Uncomment below if you also want the separate username property
            # Dimension(name="customUser:username"),
        ],
        metrics=[
            Metric(name="screenPageViews"),  # Page views
            Metric(name="sessions"),  # Sessions
            Metric(name="activeUsers"),  # Unique users
            Metric(name="engagementRate"),  # Engagement rate
        ],
        date_ranges=[
            DateRange(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
            )
        ],
        # Filter to only show rows where userId is set (authenticated users)
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="userId",
                string_filter=Filter.StringFilter(
                    match_type=Filter.StringFilter.MatchType.PARTIAL_REGEXP,
                    value=".+",  # Match any non-empty value
                ),
            )
        ),
        # Order by page views descending
        order_bys=[
            OrderBy(
                metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"),
                desc=True,
            )
        ],
        limit=1000,  # Adjust if you have more users
    )

    response = client.run_report(request)

    # Parse response into a list of dictionaries
    data = []
    for row in response.rows:
        user_id_full = row.dimension_values[0].value
        
        # Parse the "subject|username" format
        if "|" in user_id_full:
            subject, username = user_id_full.split("|", 1)
        else:
            subject = user_id_full
            username = "(unknown)"

        data.append({
            "user_id": subject,
            "username": username,
            "user_id_full": user_id_full,
            "pageviews": int(row.metric_values[0].value),
            "sessions": int(row.metric_values[1].value),
            "active_users": int(row.metric_values[2].value),
            "engagement_rate": f"{float(row.metric_values[3].value):.2%}",
        })

    # Create DataFrame
    df = pd.DataFrame(data)

    # Print summary
    print(f"\n{'='*80}")
    print(f"Report Summary: User Page Views (Last {days_back} Days)")
    print(f"{'='*80}")
    print(f"Total Users: {len(df)}")
    print(f"Total Pageviews: {df['pageviews'].sum():,}")
    print(f"Total Sessions: {df['sessions'].sum():,}")
    print(f"\n{'='*80}")
    print(f"Top 20 Users by Page Views:")
    print(f"{'='*80}\n")

    # Print top 20 users
    print(df.head(20).to_string(index=False))

    # Save to file if requested
    if output_file:
        df.to_csv(output_file, index=False)
        print(f"\n✅ Full report saved to: {output_file}")

    return df


def main():
    """Main entry point for the script."""
    # Configuration
    PROPERTY_ID = os.getenv("GA4_PROPERTY_ID", "")
    DAYS_BACK = int(os.getenv("GA4_DAYS_BACK", "30"))
    OUTPUT_FILE = os.getenv("GA4_OUTPUT_FILE", "user-pageviews-report.csv")

    if not PROPERTY_ID:
        print("Error: GA4_PROPERTY_ID environment variable not set.")
        print("\nUsage:")
        print("  1. Find your Property ID: GA4 -> Admin -> Property Settings")
        print("  2. Set environment variable:")
        print("     Windows PowerShell: $env:GA4_PROPERTY_ID='123456789'")
        print("     Linux/Mac: export GA4_PROPERTY_ID='123456789'")
        print("  3. Run: python ga-user-pageviews-report.py")
        print("\nOptional environment variables:")
        print("  - GA4_DAYS_BACK: Number of days to look back (default: 30)")
        print("  - GA4_OUTPUT_FILE: Output CSV filename (default: user-pageviews-report.csv)")
        sys.exit(1)

    try:
        df = get_user_pageviews_report(
            property_id=PROPERTY_ID,
            days_back=DAYS_BACK,
            output_file=OUTPUT_FILE,
        )
        print(f"\n✅ Report generation complete!")
        return 0
    except Exception as e:
        print(f"\n❌ Error generating report: {e}")
        print("\nTroubleshooting:")
        print("  1. Ensure Google Analytics Data API is enabled in Google Cloud Console")
        print("  2. Set GOOGLE_APPLICATION_CREDENTIALS to your service account key file")
        print("  3. Verify your Property ID is correct")
        print("  4. Check that your service account has 'Viewer' role in GA4")
        return 1


if __name__ == "__main__":
    sys.exit(main())
