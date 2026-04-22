## Summary

- **Merge full feature set**: Auth (Supabase), wishlist, alerts, product comparison tu Technology repo
- **Keep optimized trending-deals** tu deploy_mini (cache, warm-up, retry, HikariCP pool, Caffeine cache)
- **Deploy-ready**: Dockerfile (backend), vercel.json (frontend), render.yaml (backend)
- **CORS configured** cho tat ca Vercel deployment domains
- **Security**: removed hardcoded credentials, use env vars
- **Build verified**: frontend (Vite build OK), backend (Maven compile + package OK)

## What's merged

| Feature | Source |
|---------|--------|
| Trending deals (optimized) | deploy_mini |
| Auth (Supabase) | Technology |
| Wishlist/Alert | Technology |
| Product comparison | Technology |
| Search | Technology |
| Deploy configs | deploy_mini |
| CORS config | deploy_mini |
| Java backend (optimized) | deploy_mini |

## Test plan

- [ ] Deploy backend len Render voi env vars (SPRING_DATASOURCE_URL, USERNAME, PASSWORD)
- [ ] Deploy frontend len Vercel (auto-deploy on push)
- [ ] Test trending deals: load, refresh, cold start retry
- [ ] Test auth: login, logout, protected routes
- [ ] Test wishlist: add, remove, persist
- [ ] Test search: filter by platform, debounce
- [ ] Verify lang="vi" on frontend index.html
