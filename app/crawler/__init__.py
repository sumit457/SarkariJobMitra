from app.crawler.parsers.example_static_html import ExampleStaticHtmlParser
from app.crawler.parsers.ssc_notices import SSCNoticesParser

PARSERS = {
    "example_static_html": ExampleStaticHtmlParser(),
    "ssc_notices": SSCNoticesParser(),
}
