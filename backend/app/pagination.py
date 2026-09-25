from typing import Any, TypeVar

from sqlalchemy.orm import Query

T = TypeVar("T")


def clamp_page(page: int) -> int:
    return max(1, page)


def clamp_page_size(page_size: int, max_size: int = 100) -> int:
    return min(max(page_size, 1), max_size)


def paginate_query(query: Query, page: int, page_size: int) -> tuple[list[T], dict[str, Any]]:
    page = clamp_page(page)
    page_size = clamp_page_size(page_size)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, (total + page_size - 1) // page_size)
    meta = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }
    return items, meta
