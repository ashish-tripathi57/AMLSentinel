from api.main import create_app


def test_create_app():
    """Verify the FastAPI application factory creates a valid app."""
    application = create_app()
    assert application.title == "AML Sentinel API"
    assert application.version == "1.0.0"
