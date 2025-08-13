"""
Pagination classes for the application.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class for API results.
    Provides additional metadata in the response.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        """
        Return paginated response with additional metadata.
        """
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        """
        Return the paginated response schema for OpenAPI documentation.
        """
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "example": 100,
                    "description": "Total number of items",
                },
                "next": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.org/accounts/?page=4",
                },
                "previous": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.org/accounts/?page=2",
                },
                "total_pages": {
                    "type": "integer",
                    "example": 5,
                    "description": "Total number of pages",
                },
                "current_page": {
                    "type": "integer",
                    "example": 3,
                    "description": "Current page number",
                },
                "page_size": {
                    "type": "integer",
                    "example": 20,
                    "description": "Number of items per page",
                },
                "results": schema,
            },
        }


class SmallResultsSetPagination(StandardResultsSetPagination):
    """
    Smaller pagination for lists that don't need many items per page.
    """

    page_size = 10
    max_page_size = 50


class LargeResultsSetPagination(StandardResultsSetPagination):
    """
    Larger pagination for data exports or bulk operations.
    """

    page_size = 50
    max_page_size = 200
