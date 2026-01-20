defmodule BackendWeb.Router do
  use BackendWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug Corsica, origins: "*", allow_headers: :all, allow_methods: :all
  end

  pipeline :auth do
    plug :accepts, ["html", "json"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug Corsica, origins: "*", allow_headers: :all, allow_methods: :all
  end

  pipeline :authenticated do
    plug BackendWeb.Plugs.Auth
  end

  pipeline :optional_auth do
    plug BackendWeb.Plugs.OptionalAuth
  end

  # Public auth routes (need session support for OAuth)
  scope "/api/auth", BackendWeb do
    pipe_through :auth

    get "/:provider", AuthController, :request
    get "/:provider/callback", AuthController, :callback
  end

  # Logout route (API-only)
  scope "/api/auth", BackendWeb do
    pipe_through :api

    post "/logout", AuthController, :logout
  end

  # Protected API routes
  scope "/api", BackendWeb do
    pipe_through [:api, :authenticated]

    get "/me", AuthController, :me
    get "/me/counts", AuthController, :counts
    put "/me/onboard", AuthController, :onboard

    # Posts
    post "/posts", PostController, :create
    delete "/posts/:id", PostController, :delete

    # Projects
    post "/projects", ProjectController, :create
    delete "/projects/:id", ProjectController, :delete

    # Comments
    post "/comments", CommentController, :create
    delete "/comments/:id", CommentController, :delete

    # Likes
    post "/likes", LikeController, :toggle

    # Reposts
    post "/reposts", RepostController, :toggle

    # Bookmarks
    post "/bookmarks", BookmarkController, :toggle
    get "/bookmarks", BookmarkController, :index

    # Reports
    post "/reports", ReportController, :create

    # User actions
    post "/users/:username/follow", UserController, :follow
    delete "/users/:username/follow", UserController, :unfollow
    get "/users/check-username/:username", UserController, :check_username

    # Notifications
    get "/notifications", NotificationController, :index
    post "/notifications/:id/read", NotificationController, :mark_read
    post "/notifications/read-all", NotificationController, :mark_all_read

    # Messaging
    get "/conversations", ConversationController, :index
    post "/conversations", ConversationController, :create
    get "/conversations/:id", ConversationController, :show
    post "/conversations/:id/messages", ConversationController, :create_message
    post "/conversations/:id/read", ConversationController, :mark_read

    # User search (authenticated)
    get "/users/search", UserController, :search
  end

  # Public API routes with optional auth
  scope "/api", BackendWeb do
    pipe_through [:api, :optional_auth]

    # Users with optional auth (to exclude current user from suggestions)
    get "/users/suggested", UserController, :suggested
  end

  # Public API routes with optional auth
  scope "/api", BackendWeb do
    pipe_through [:api, :optional_auth]

    # Posts (with optional auth for engagement status)
    get "/posts", PostController, :index
  end

  # Public API routes with optional auth (for engagement status)
  scope "/api", BackendWeb do
    pipe_through [:api, :optional_auth]

    # Comments (with optional auth for like status)
    get "/comments", CommentController, :index

    # Projects (with optional auth for like/bookmark status)
    get "/projects/:id", ProjectController, :show

    # Impressions (with optional auth for user tracking)
    post "/impressions", ImpressionController, :create
  end

  # Public API routes (no auth required)
  scope "/api", BackendWeb do
    pipe_through :api

    get "/posts/:id", PostController, :show

    # Projects
    get "/projects", ProjectController, :index

    # Users
    get "/users/:username", UserController, :show
    get "/users/:username/posts", UserController, :posts
    get "/users/:username/projects", UserController, :projects
    get "/users/:username/likes", UserController, :likes
    get "/users/:username/reposts", UserController, :reposts

    # Catalog
    get "/tools", CatalogController, :ai_tools
    get "/stacks", CatalogController, :tech_stacks
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:backend, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: BackendWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
