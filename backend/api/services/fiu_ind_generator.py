"""FIU-IND STR (Suspicious Transaction Report) PDF generator.

Produces a PDF in the Financial Intelligence Unit — India STR format,
covering four parts: Reporting Entity, Suspect Details, Transaction
Details, and Reason for Suspicion.
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.transaction import TransactionRepository


# ---------------------------------------------------------------------------
# Style definitions
# ---------------------------------------------------------------------------

_styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    "STRTitle",
    parent=_styles["Title"],
    fontSize=16,
    spaceAfter=6,
    textColor=colors.HexColor("#1E293B"),
)

PART_HEADER_STYLE = ParagraphStyle(
    "STRPartHeader",
    parent=_styles["Heading2"],
    fontSize=13,
    spaceBefore=16,
    spaceAfter=6,
    textColor=colors.HexColor("#2563EB"),
)

FIELD_LABEL_STYLE = ParagraphStyle(
    "STRFieldLabel",
    parent=_styles["Normal"],
    fontSize=9,
    textColor=colors.HexColor("#64748B"),
    fontName="Helvetica-Bold",
)

BODY_STYLE = ParagraphStyle(
    "STRBody",
    parent=_styles["Normal"],
    fontSize=10,
    leading=14,
    textColor=colors.HexColor("#334155"),
    spaceAfter=10,
)

FOOTER_STYLE = ParagraphStyle(
    "STRFooter",
    parent=_styles["Normal"],
    fontSize=7,
    textColor=colors.HexColor("#94A3B8"),
    alignment=1,
)

SUBTITLE_STYLE = ParagraphStyle(
    "STRSubtitle",
    parent=_styles["Normal"],
    fontSize=9,
    textColor=colors.HexColor("#64748B"),
    spaceAfter=14,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _separator_line(doc_width: float):
    """Return a thin horizontal rule as a table flowable."""
    line_table = Table([[""]], colWidths=[doc_width])
    line_table.setStyle(
        TableStyle([("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#E2E8F0"))])
    )
    return line_table


def _field_row(label: str, value: str) -> list[str]:
    """Build a two-column row: bold label and its value."""
    return [label, value or "N/A"]


def _format_inr(amount: float) -> str:
    """Format a numeric amount as Indian Rupees."""
    return f"\u20b9{amount:,.2f}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def generate_str_pdf(alert_id: str, session: AsyncSession) -> bytes:
    """Generate a FIU-IND STR PDF for the given alert and return raw bytes.

    Args:
        alert_id: UUID of the alert.
        session: Async database session.

    Returns:
        PDF file contents as bytes.

    Raises:
        ValueError: When the alert or its customer is not found.
    """
    alert_repo = AlertRepository(session)
    alert = await alert_repo.get_by_id(alert_id)
    if alert is None:
        raise ValueError(f"Alert '{alert_id}' not found")

    customer_repo = CustomerRepository(session)
    customer = await customer_repo.get_by_id(alert.customer_id)
    if customer is None:
        raise ValueError(f"Customer for alert '{alert_id}' not found")

    txn_repo = TransactionRepository(session)
    flagged_transactions = await txn_repo.get_by_alert(alert_id)

    # Determine branch from first account (if available)
    branch_name = "N/A"
    if customer.accounts:
        branch_name = customer.accounts[0].branch or "Main Branch"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    story: list = []

    # Title
    story.append(Paragraph("Suspicious Transaction Report (STR)", TITLE_STYLE))
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(f"FIU-IND Filing | Alert {alert.alert_id} | Generated {generated_at}", SUBTITLE_STYLE))
    story.append(_separator_line(doc.width))
    story.append(Spacer(1, 8))

    # ------------------------------------------------------------------
    # Part A: Reporting Entity
    # ------------------------------------------------------------------
    story.append(Paragraph("Part A: Reporting Entity", PART_HEADER_STYLE))

    part_a_data = [
        _field_row("Reporting Entity", "AML Sentinel Bank"),
        _field_row("Branch", branch_name),
        _field_row("IFSC Code", "AMLS0001234"),
        _field_row("Report Date", generated_at),
        _field_row("Reference Number", f"STR-{alert.alert_id}"),
    ]
    part_a_table = Table(part_a_data, colWidths=[140, doc.width - 140])
    part_a_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1E293B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(part_a_table)
    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # Part B: Suspect Details
    # ------------------------------------------------------------------
    story.append(Paragraph("Part B: Suspect Details", PART_HEADER_STYLE))

    pep_label = "Yes" if customer.pep_status else "No"
    part_b_data = [
        _field_row("Full Name", customer.full_name),
        _field_row("Date of Birth", customer.date_of_birth),
        _field_row("Nationality", customer.nationality),
        _field_row("Occupation", customer.occupation),
        _field_row("Employer", customer.employer),
        _field_row("ID Type", customer.id_type),
        _field_row("ID Number", customer.id_number),
        _field_row("Address", customer.address),
        _field_row("Phone", customer.phone),
        _field_row("Email", customer.email),
        _field_row("PEP Status", pep_label),
        _field_row("Risk Category", customer.risk_category),
        _field_row("Customer Since", customer.customer_since),
    ]
    part_b_table = Table(part_b_data, colWidths=[140, doc.width - 140])
    part_b_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1E293B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(part_b_table)
    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # Part C: Transaction Details
    # ------------------------------------------------------------------
    story.append(Paragraph("Part C: Transaction Details", PART_HEADER_STYLE))

    if flagged_transactions:
        txn_header = ["Date", "Type", "Amount (INR)", "Direction", "Counterparty", "Channel"]
        txn_rows = [txn_header]
        for txn in flagged_transactions:
            txn_rows.append([
                txn.transaction_date[:10] if txn.transaction_date else "N/A",
                txn.transaction_type or "N/A",
                _format_inr(txn.amount),
                txn.direction or "N/A",
                txn.counterparty_name or "N/A",
                txn.channel or "N/A",
            ])

        col_widths = [70, 60, 80, 55, 120, 60]
        txn_table = Table(txn_rows, colWidths=col_widths, repeatRows=1)
        txn_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),
            ])
        )
        story.append(txn_table)

        story.append(Spacer(1, 4))
        total_amount = sum(t.amount for t in flagged_transactions)
        story.append(
            Paragraph(
                f"Total flagged amount: {_format_inr(total_amount)} across "
                f"{len(flagged_transactions)} transaction(s)",
                BODY_STYLE,
            )
        )
    else:
        story.append(Paragraph("No flagged transactions recorded.", BODY_STYLE))

    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # Part D: Reason for Suspicion
    # ------------------------------------------------------------------
    story.append(Paragraph("Part D: Reason for Suspicion", PART_HEADER_STYLE))

    part_d_data = [
        _field_row("Alert Title", alert.title),
        _field_row("Typology", alert.typology),
        _field_row("Risk Score", f"{alert.risk_score}/100"),
        _field_row("Triggered Date", alert.triggered_date),
    ]
    part_d_table = Table(part_d_data, colWidths=[140, doc.width - 140])
    part_d_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1E293B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(part_d_table)
    story.append(Spacer(1, 6))

    if alert.description:
        story.append(Paragraph("Pattern Summary:", FIELD_LABEL_STYLE))
        for paragraph in alert.description.split("\n"):
            stripped = paragraph.strip()
            if stripped:
                story.append(Paragraph(stripped, BODY_STYLE))

    # Footer
    story.append(Spacer(1, 20))
    story.append(_separator_line(doc.width))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Generated by AML Sentinel — Built with G.U.I.D.E.\u2122 Framework | "
            "This document is confidential and intended for FIU-IND filing purposes only.",
            FOOTER_STYLE,
        )
    )

    doc.build(story)
    return buffer.getvalue()
