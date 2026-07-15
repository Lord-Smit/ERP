import logging
from django.core.mail import EmailMessage
from django.conf import settings
from common.pdf import render_pdf

logger = logging.getLogger(__name__)


def send_accepted_documents_email(super_admin_emails, quotation_data, contract_data, invoice_data):
    """
    Renders and sends Quotation, Contract, and Invoice PDFs to Super Admins.
    Runs inside a background thread so it doesn't block the request response.
    """
    if not super_admin_emails:
        logger.warning("No active super_admin emails found. Email not sent.")
        return

    try:
        # Render Quotation PDF
        quotation_num = quotation_data.get('quotation_number', 'N/A')
        quotation_pdf = render_pdf('pdf/quotation.html', {'quotation': quotation_data})
        quotation_pdf_bytes = quotation_pdf.content

        # Render Contract PDF
        contract_num = contract_data.get('contract_number', 'N/A')
        contract_pdf = render_pdf('pdf/contract.html', {'contract': contract_data})
        contract_pdf_bytes = contract_pdf.content

        # Render Invoice PDF
        invoice_num = invoice_data.get('invoice_number', 'N/A')
        invoice_pdf = render_pdf('pdf/invoice.html', {'invoice': invoice_data})
        invoice_pdf_bytes = invoice_pdf.content

        # Build email
        email = EmailMessage(
            subject=f"Accepted Quotation & Agreement Documents - {quotation_num}",
            body=(
                f"Hello,\n\n"
                f"The quotation {quotation_num} has been accepted.\n\n"
                f"Please find attached the generated Quotation, Contract, and Invoice documents for your records.\n\n"
                f"Details:\n"
                f"- Quotation: {quotation_num}\n"
                f"- Contract: {contract_num}\n"
                f"- Invoice: {invoice_num}\n\n"
                f"Best regards,\n"
                f"ERP Rental Team"
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@erprental.com'),
            to=super_admin_emails,
        )

        # Attach PDFs
        email.attach(f"quotation_{quotation_num}.pdf", quotation_pdf_bytes, "application/pdf")
        email.attach(f"contract_{contract_num}.pdf", contract_pdf_bytes, "application/pdf")
        email.attach(f"invoice_{invoice_num}.pdf", invoice_pdf_bytes, "application/pdf")

        # Send
        email.send(fail_silently=False)
        logger.info(f"Accepted documents email sent successfully to {super_admin_emails}")

    except Exception as e:
        logger.error(f"Failed to generate or send accepted documents email: {str(e)}", exc_info=True)
