from app.crawler.parsers.example_static_html import ExampleStaticHtmlParser
from app.crawler.parsers.generic_official import GenericOfficialParser
from app.crawler.parsers.ssc_notices import SSCNoticesParser
from app.crawler.parsers.upsc_exams import (
    UPSCActiveExamsParser,
    UPSCExamCalendarParser,
    UPSCForthcomingExamsParser,
)

PARSERS = {
    "example_static_html": ExampleStaticHtmlParser(),
    "generic_official": GenericOfficialParser(),
    "ssc_notices": SSCNoticesParser(),
    "upsc_active_exams": UPSCActiveExamsParser(),
    "upsc_forthcoming_exams": UPSCForthcomingExamsParser(),
    "upsc_exam_calendar_2026": UPSCExamCalendarParser(target_year="2026"),
}
