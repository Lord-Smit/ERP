from io import BytesIO
from django.template.loader import render_to_string
from django.http import HttpResponse

try:
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except OSError as e:
    HAS_WEASYPRINT = False
    _import_error = str(e)


def render_pdf(template_name, context, filename='document.pdf'):
    if not HAS_WEASYPRINT:
        raise RuntimeError(
            'WeasyPrint is not available. On Windows, install the GTK3 runtime from '
            'https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer '
            f'Original error: {_import_error}'
        )
    html_string = render_to_string(template_name, context)
    pdf_file = BytesIO()
    HTML(string=html_string).write_pdf(pdf_file)
    pdf_file.seek(0)
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
