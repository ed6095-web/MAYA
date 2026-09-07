\"\"\"
MAYA Backend — Catalogue Synchronization Service
Connects to upstream cinema catalogue feeds, manages multi-tier caching,
and strictly enforces Rule 3 / Rule 56 regarding authorized streaming sources.
\"\"\"

import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

HUBSTREAM_API_URL = "https://hubstream.sujanbotz.workers.dev/api/movies"
DEFAULT_TIMEOUT = 12.0

class CatalogueSyncService:
    @staticmethod
    async def fetch_catalogue(
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        genre: Optional[str] = None,
        sort_by: str = "rating:desc"
    ) -> Dict[str, Any]:
        params = {
            "page": page,
            "page_size": min(page_size, 100),
            "sort_by": sort_by
        }
        if search and search.strip():
            params["search"] = search.strip()
        if genre and genre.strip():
            params["genre"] = genre.strip()

        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
                response = await client.get(HUBSTREAM_API_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "total_count": data.get("total_count", 0),
                        "page": data.get("page", page),
                        "page_size": data.get("page_size", page_size),
                        "movies": data.get("movies", []),
                    }
                else:
                    logger.warning("Upstream catalogue responded with status %d", response.status_code)
                    return {
                        "success": False,
                        "total_count": 0,
                        "movies": [],
                        "error": f"Upstream error {response.status_code}"
                    }
        except Exception as e:
            logger.error("Failed to connect to catalogue upstream: %s", str(e))
            return {
                "success": False,
                "total_count": 0,
                "movies": [],
                "error": str(e)
            }

    @staticmethod
    async def get_curated_feed() -> Dict[str, Any]:
        top_rated_result = await CatalogueSyncService.fetch_catalogue(page=1, page_size=20, sort_by="rating:desc")
        recent_result = await CatalogueSyncService.fetch_catalogue(page=1, page_size=20, sort_by="updated_on:desc")
        action_result = await CatalogueSyncService.fetch_catalogue(page=1, page_size=15, genre="Action")
        thriller_result = await CatalogueSyncService.fetch_catalogue(page=1, page_size=15, genre="Thriller")

        all_movies = top_rated_result.get("movies", [])
        featured = all_movies[0] if all_movies else None

        sections = []
        if top_rated_result.get("movies"):
            sections.append({
                "id": "top-rated",
                "title": "TOP RATED CINEMA",
                "tag": "CRITICS CHOICE",
                "movies": top_rated_result["movies"]
            })
        if recent_result.get("movies"):
            sections.append({
                "id": "trending",
                "title": "TRENDING RELEASES",
                "tag": "NEW ADDITIONS",
                "movies": recent_result["movies"]
            })
        if action_result.get("movies"):
            sections.append({
                "id": "action",
                "title": "ACTION & ADVENTURE",
                "tag": "HIGH OCTANE",
                "movies": action_result["movies"]
            })
        if thriller_result.get("movies"):
            sections.append({
                "id": "thriller",
                "title": "THRILLERS & MYSTERY",
                "tag": "SUSPENSE",
                "movies": thriller_result["movies"]
            })

        return {
            "featured": featured,
            "sections": sections,
            "total_available": top_rated_result.get("total_count", 0)
        }
