from io import BytesIO
from django.template.loader import render_to_string
from django.http import HttpResponse
from xhtml2pdf import pisa


def render_pdf(template_name, context, filename='document.pdf'):
    html_string = render_to_string(template_name, context)
    pdf_file = BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
    if pisa_status.err:
        raise RuntimeError('Failed to generate PDF using xhtml2pdf')
    pdf_file.seek(0)
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
