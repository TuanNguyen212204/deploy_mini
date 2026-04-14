import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import SearchResultsPage from './pages/SearchResultsPage'
import AlertsPage from './pages/AlertsPage'
import WishlistPage from './pages/WishlistPage'
import DealsPage from './pages/DealsPage'
import TrendingDealsPage from './pages/TrendingDealsPage'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
<Route path="/wishlist" element={<WishlistPage />} />
<Route path="/deals" element={<DealsPage />} />
        <Route path="/trending-deals" element={<TrendingDealsPage />} />
      </Routes>
    </BrowserRouter>
  )
}