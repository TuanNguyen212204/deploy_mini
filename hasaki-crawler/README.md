# Hasaki Crawler

Crawler scaffold for Hasaki.vn following the same structure as your Cocolux crawler.

## Priority categories for listing crawl
The listing pipeline automatically sorts discovered categories so these run first when present:
1. Băng vệ sinh
2. Tẩy trang
3. Body mist / Xịt thơm toàn thân

## Run

```bash
npm install
npx playwright install chromium
npm run discover:categories
npm run crawl:listings
npm run crawl:details
```

## Notes
- The selectors are intentionally broad because Hasaki uses dynamic frontend markup.
- The category order is prioritized by keyword score, then alphabetical.
- Pagination uses `?p=` for pages > 1.
- Debug HTML is saved when a page fails.
