"""Case File PDF generator.

Produces a comprehensive investigation dossier for an AML alert, including
cover page, customer profile, transactions, pattern analysis, checklist,
notes, SAR narrative, and audit trail.
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.alert import AlertRepository
from api.repositories.customer import CustomerRepository
from api.repositories.investigation import (
    AuditTrailRepository,
    ChecklistRepository,
    InvestigationNoteRepository,
    SARDraftRepository,
)
from api.repositories.transaction import TransactionRepository


# ---------------------------------------------------------------------------
# Style definitions
# ---------------------------------------------------------------------------

_styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    "CFTitle",
    parent=_styles["Title"],
    fontSize=20,
    spaceAfter=8,
    textColor=colors.HexColor("#1E293B"),
)

SECTION_HEADER_STYLE = ParagraphStyle(
    "CFSectionHeader",
    parent=_styles["Heading2"],
    fontSize=13,
    spaceBefore=16,
    spaceAfter=6,
    textColor=colors.HexColor("#2563EB"),
)

SUBSECTION_HEADER_STYLE = ParagraphStyle(
    "CFSubsectionHeader",
    parent=_styles["Heading3"],
    fontSize=11,
    spaceBefore=10,
    spaceAfter=4,
    textColor=colors.HexColor("#1E293B"),
)

BODY_STYLE = ParagraphStyle(
    "CFBody",
    parent=_styles["Normal"],
    fontSize=10,
    leading=14,
    textColor=colors.HexColor("#334155"),
    spaceAfter=8,
)

LABEL_STYLE = ParagraphStyle(
    "CFLabel",
    parent=_styles["Normal"],
    fontSize=9,
    textColor=colors.HexColor("#64748B"),
    fontName="Helvetica-Bold",
)

FOOTER_STYLE = ParagraphStyle(
    "CFFooter",
    parent=_styles["Normal"],
    fontSize=7,
    textColor=colors.HexColor("#94A3B8"),
    alignment=1,
)

SUBTITLE_STYLE = ParagraphStyle(
    "CFSubtitle",
    parent=_styles["Normal"],
    fontSize=10,
    textColor=colors.HexColor("#64748B"),
    spaceAfter=14,
)

NOTE_STYLE = ParagraphStyle(
    "CFNote",
    parent=_styles["Normal"],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor("#334155"),
    leftIndent=12,
    spaceAfter=6,
)

CHECKED_STYLE = ParagraphStyle(
    "CFChecked",
    parent=_styles["Normal"],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor("#059669"),
    spaceAfter=4,
)

UNCHECKED_STYLE = ParagraphStyle(
    "CFUnchecked",
    parent=_styles["Normal"],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor("#DC2626"),
    spaceAfter=4,
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


def _safe_paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    """Create a Paragraph, escaping XML-sensitive characters."""
    safe_text = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return Paragraph(safe_text, style)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def generate_case_file_pdf(alert_id: str, session: AsyncSession) -> bytes:
    """Generate a comprehensive case file PDF for the given alert.

    Args:
        alert_id: UUID of the alert.
        session: Async database session.

    Returns:
        PDF file contents as bytes.

    Raises:
        ValueError: When the alert or its customer is not found.
    """
    # ---- Fetch all data ----
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

    checklist_repo = ChecklistRepository(session)
    checklist_items = await checklist_repo.get_by_alert(alert_id)

    note_repo = InvestigationNoteRepository(session)
    investigation_notes = await note_repo.get_by_alert(alert_id)

    sar_repo = SARDraftRepository(session)
    latest_sar = await sar_repo.get_latest(alert_id)

    audit_repo = AuditTrailRepository(session)
    audit_entries = await audit_repo.get_by_alert(alert_id)

    # ---- Build PDF ----
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
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # ==================================================================
    # Cover Page
    # ==================================================================
    story.append(Spacer(1, 60))
    story.append(Paragraph("AML Sentinel", TITLE_STYLE))
    story.append(Paragraph("Investigation Case File", SECTION_HEADER_STYLE))
    story.append(Spacer(1, 20))
    story.append(_separator_line(doc.width))
    story.append(Spacer(1, 12))

    cover_data = [
        _field_row("Alert ID", alert.alert_id),
        _field_row("Title", alert.title),
        _field_row("Typology", alert.typology),
        _field_row("Risk Score", f"{alert.risk_score}/100"),
        _field_row("Status", alert.status),
        _field_row("Resolution", alert.resolution),
        _field_row("Triggered Date", alert.triggered_date),
        _field_row("Assigned Analyst", alert.assigned_analyst),
        _field_row("Report Generated", generated_at),
    ]
    cover_table = Table(cover_data, colWidths=[140, doc.width - 140])
    cover_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1E293B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(cover_table)
    story.append(PageBreak())

    # ==================================================================
    # 1. Customer Profile
    # ==================================================================
    story.append(Paragraph("1. Customer Profile", SECTION_HEADER_STYLE))

    pep_label = "Yes" if customer.pep_status else "No"
    profile_data = [
        _field_row("Full Name", customer.full_name),
        _field_row("Date of Birth", customer.date_of_birth),
        _field_row("Nationality", customer.nationality),
        _field_row("Occupation", customer.occupation),
        _field_row("Employer", customer.employer),
        _field_row("Declared Income", _format_inr(customer.declared_annual_income) if customer.declared_annual_income else "N/A"),
        _field_row("Risk Category", customer.risk_category),
        _field_row("Customer Since", customer.customer_since),
        _field_row("ID Type", customer.id_type),
        _field_row("ID Number", customer.id_number),
        _field_row("Address", customer.address),
        _field_row("Phone", customer.phone),
        _field_row("Email", customer.email),
        _field_row("PEP Status", pep_label),
        _field_row("Previous Alerts", str(customer.previous_alert_count)),
        _field_row("KYC Verification", customer.kyc_verification_date),
        _field_row("KYC Last Updated", customer.kyc_last_update_date),
    ]
    profile_table = Table(profile_data, colWidths=[140, doc.width - 140])
    profile_table.setStyle(
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
    story.append(profile_table)

    # Account details
    if customer.accounts:
        story.append(Paragraph("Account Details", SUBSECTION_HEADER_STYLE))
        acct_header = ["Account Number", "Type", "Branch", "Status", "Balance (INR)"]
        acct_rows = [acct_header]
        for acct in customer.accounts:
            acct_rows.append([
                acct.account_number,
                acct.account_type,
                acct.branch or "N/A",
                acct.status,
                _format_inr(acct.current_balance),
            ])
        acct_table = Table(acct_rows, colWidths=[100, 70, 100, 60, 90], repeatRows=1)
        acct_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("ALIGN", (4, 1), (4, -1), "RIGHT"),
            ])
        )
        story.append(acct_table)

    story.append(Spacer(1, 10))

    # ==================================================================
    # 2. Transaction Summary
    # ==================================================================
    story.append(Paragraph("2. Transaction Summary", SECTION_HEADER_STYLE))

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

        txn_table = Table(txn_rows, colWidths=[70, 60, 80, 55, 120, 60], repeatRows=1)
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
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),
            ])
        )
        story.append(txn_table)

        total_amount = sum(t.amount for t in flagged_transactions)
        story.append(Spacer(1, 4))
        story.append(
            Paragraph(
                f"Total flagged amount: {_format_inr(total_amount)} across "
                f"{len(flagged_transactions)} transaction(s)",
                BODY_STYLE,
            )
        )
    else:
        story.append(Paragraph("No flagged transactions recorded.", BODY_STYLE))

    story.append(Spacer(1, 10))

    # ==================================================================
    # 3. Pattern Analysis
    # ==================================================================
    story.append(Paragraph("3. Pattern Analysis", SECTION_HEADER_STYLE))

    analysis_data = [
        _field_row("Typology", alert.typology),
        _field_row("Risk Score", f"{alert.risk_score}/100"),
        _field_row("Flagged Transactions", str(alert.flagged_transaction_count)),
        _field_row("Total Flagged Amount", _format_inr(alert.total_flagged_amount) if alert.total_flagged_amount else "N/A"),
    ]
    analysis_table = Table(analysis_data, colWidths=[140, doc.width - 140])
    analysis_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1E293B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(analysis_table)

    if alert.description:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Description:", LABEL_STYLE))
        for paragraph in alert.description.split("\n"):
            stripped = paragraph.strip()
            if stripped:
                story.append(_safe_paragraph(stripped, BODY_STYLE))

    story.append(Spacer(1, 10))

    # ==================================================================
    # 4. Investigation Checklist
    # ==================================================================
    story.append(Paragraph("4. Investigation Checklist", SECTION_HEADER_STYLE))

    if checklist_items:
        for item in checklist_items:
            check_marker = "\u2705" if item.is_checked else "\u2610"
            checked_by_label = f" (by {item.checked_by})" if item.checked_by else ""
            style = CHECKED_STYLE if item.is_checked else UNCHECKED_STYLE
            story.append(
                _safe_paragraph(
                    f"{check_marker} {item.description}{checked_by_label}",
                    style,
                )
            )
            if item.ai_rationale:
                story.append(
                    _safe_paragraph(f"AI Rationale: {item.ai_rationale}", NOTE_STYLE)
                )
    else:
        story.append(Paragraph("No checklist items found.", BODY_STYLE))

    story.append(Spacer(1, 10))

    # ==================================================================
    # 5. Investigation Notes
    # ==================================================================
    story.append(Paragraph("5. Investigation Notes", SECTION_HEADER_STYLE))

    if investigation_notes:
        for note in investigation_notes:
            timestamp = note.created_at if hasattr(note, "created_at") and note.created_at else "Unknown date"
            story.append(
                Paragraph(
                    f"<b>{note.analyst_username}</b> ({timestamp}):",
                    LABEL_STYLE,
                )
            )
            story.append(_safe_paragraph(note.content, NOTE_STYLE))
    else:
        story.append(Paragraph("No investigation notes recorded.", BODY_STYLE))

    story.append(Spacer(1, 10))

    # ==================================================================
    # 6. SAR Narrative
    # ==================================================================
    story.append(Paragraph("6. SAR Narrative", SECTION_HEADER_STYLE))

    if latest_sar:
        story.append(
            Paragraph(f"Version {latest_sar.version} (generated by {latest_sar.generated_by})", SUBTITLE_STYLE)
        )
        sar_sections = [
            ("Subject Information", latest_sar.subject_info),
            ("Activity Description", latest_sar.activity_description),
            ("Narrative", latest_sar.narrative),
            ("Reason for Suspicion", latest_sar.reason_for_suspicion),
            ("Action Taken", latest_sar.action_taken),
        ]
        for section_title, content in sar_sections:
            story.append(Paragraph(section_title, SUBSECTION_HEADER_STYLE))
            text = content or "Not yet generated."
            for paragraph in text.split("\n"):
                stripped = paragraph.strip()
                if stripped:
                    story.append(_safe_paragraph(stripped, BODY_STYLE))
    else:
        story.append(Paragraph("No SAR draft has been generated yet.", BODY_STYLE))

    story.append(Spacer(1, 10))

    # ==================================================================
    # 7. Audit Trail
    # ==================================================================
    story.append(Paragraph("7. Audit Trail", SECTION_HEADER_STYLE))

    if audit_entries:
        audit_header = ["Timestamp", "Action", "Performed By", "Details"]
        audit_rows = [audit_header]
        for entry in audit_entries:
            timestamp_str = entry.created_at if hasattr(entry, "created_at") and entry.created_at else "N/A"
            audit_rows.append([
                str(timestamp_str)[:19] if timestamp_str else "N/A",
                entry.action or "N/A",
                entry.performed_by or "N/A",
                (entry.details or "N/A")[:80],
            ])
        audit_table = Table(audit_rows, colWidths=[100, 80, 80, doc.width - 260], repeatRows=1)
        audit_table.setStyle(
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
            ])
        )
        story.append(audit_table)
    else:
        story.append(Paragraph("No audit trail entries recorded.", BODY_STYLE))

    # Footer
    story.append(Spacer(1, 20))
    story.append(_separator_line(doc.width))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            f"AML Sentinel — Investigation Case File | Alert {alert.alert_id} | "
            f"Generated {generated_at} | Built with G.U.I.D.E.\u2122 Framework",
            FOOTER_STYLE,
        )
    )

    doc.build(story)
    return buffer.getvalue()
