"""Bulk SAR/STR export service.

Generates a ZIP archive containing one FIU-IND STR PDF per alert ID.
Invalid or missing alert IDs are silently skipped so the caller
receives PDFs only for valid alerts.
"""

import io
import zipfile

from sqlalchemy.ext.asyncio import AsyncSession

from api.services.fiu_ind_generator import generate_str_pdf


async def generate_bulk_sar_zip(
    alert_ids: list[str], session: AsyncSession
) -> bytes:
    """Build an in-memory ZIP containing one STR PDF per valid alert ID.

    Args:
        alert_ids: List of alert UUIDs to include in the export.
        session: Async database session for PDF generation.

    Returns:
        Raw bytes of a ZIP archive. Empty list produces an empty ZIP.
    """
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for alert_id in alert_ids:
            try:
                pdf_bytes = await generate_str_pdf(alert_id, session)
            except ValueError:
                # Alert or customer not found — skip this entry
                continue

            filename = f"STR_{alert_id}.pdf"
            zf.writestr(filename, pdf_bytes)

    return buffer.getvalue()
