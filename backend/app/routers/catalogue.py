\"\"\"
MAYA Backend — Synchronized Catalogue Router
Provides client-friendly cached endpoints for /api/catalogue/feed,
/api/catalogue/movies, /api/catalogue/search, and /api/catalogue/movie/{id}.
\"\"\"

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.catalogue_sync import CatalogueSyncService

router = APIRouter(prefix="/api/catalogue", tags=["Synchronized Catalogue"])


@router.get("/feed")
async def get_catalogue_feed():
    """Returns curated featured and category rows for MAYA Web discovery."""
    return await CatalogueSyncService.get_curated_feed()


@router.get("/movies")
async def list_catalogue_movies(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    sort_by: str = Query("rating:desc"),
):
    """Query live cinema catalogue with pagination, genre filtering, and search."""
    res = await CatalogueSyncService.fetch_catalogue(
        page=page, page_size=page_size, search=search, genre=genre, sort_by=sort_by
    )
    if not res.get("success", False):
        raise HTTPException(status_code=502, detail=res.get("error", "Failed to fetch catalogue"))
    return res
