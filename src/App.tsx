import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';
import Scaffold from '@/pages/Scaffold';
import { CategoryPage, CollectionPage, GenderPage, SearchPage, ShopAll } from '@/pages/Listing';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  PrivacyPage,
  RefundPage,
  ShippingPage,
  TermsPage,
} from '@/pages/StaticPages';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* Catalogue (sample data until Phase 4) */}
        <Route path="shop" element={<ShopAll />} />
        <Route path="women" element={<GenderPage gender="women" />} />
        <Route path="men" element={<GenderPage gender="men" />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route
          path="product/:slug"
          element={<Scaffold title="Product Details" phase={4} phaseLabel="Catalogue" description="Product pages with image gallery, size and colour selection, and add to cart are built in Phase 4." />}
        />

        {/* Commerce (later phases) */}
        <Route path="cart" element={<Scaffold title="Shopping Cart" phase={5} phaseLabel="Cart & Checkout" description="The shopping cart is built in Phase 5, with prices and totals always recalculated on the server." />} />
        <Route path="checkout" element={<Scaffold title="Checkout" phase={5} phaseLabel="Cart & Checkout" description="Checkout is built in Phase 5, with delivery and advance-payment handling in Phase 6." />} />
        <Route path="order-confirmation" element={<Scaffold title="Order Confirmation" phase={5} phaseLabel="Cart & Checkout" description="Order confirmation is available once checkout is live." />} />
        <Route path="track-order" element={<Scaffold title="Order Tracking" phase={7} phaseLabel="Orders" description="Order tracking is built in Phase 7." />} />

        {/* Account (Phase 3 / 7) */}
        <Route path="login" element={<Scaffold title="Customer Login" phase={3} phaseLabel="Authentication" description="Secure sign-in with Supabase Auth is built in Phase 3." />} />
        <Route path="register" element={<Scaffold title="Create Account" phase={3} phaseLabel="Authentication" description="Customer registration is built in Phase 3." />} />
        <Route path="forgot-password" element={<Scaffold title="Forgot Password" phase={3} phaseLabel="Authentication" description="Password reset is built in Phase 3." />} />
        <Route path="account" element={<Scaffold title="My Account" phase={3} phaseLabel="Authentication" description="The customer dashboard is built in Phase 3, with order history in Phase 7." />} />
        <Route path="account/orders" element={<Scaffold title="My Orders" phase={7} phaseLabel="Orders" description="Order history is built in Phase 7." />} />
        <Route path="account/wishlist" element={<Scaffold title="My Wishlist" phase={4} phaseLabel="Catalogue" description="The wishlist is built in Phase 4, alongside customer accounts." />} />
        <Route path="account/addresses" element={<Scaffold title="My Addresses" phase={3} phaseLabel="Authentication" description="Address management is built in Phase 3." />} />

        {/* Information */}
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy-policy" element={<PrivacyPage />} />
        <Route path="terms-and-conditions" element={<TermsPage />} />
        <Route path="return-refund-policy" element={<RefundPage />} />
        <Route path="shipping-policy" element={<ShippingPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
