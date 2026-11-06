import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderConfirmation from '@/pages/OrderConfirmation';
import ProductPage from '@/pages/ProductPage';
import Wishlist from '@/pages/account/Wishlist';
import { RequireAuth, RequireSection, RequireStaff } from '@/components/auth/Guards';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import AccountLayout from '@/pages/account/AccountLayout';
import Overview from '@/pages/account/Overview';
import Profile from '@/pages/account/Profile';
import Addresses from '@/pages/account/Addresses';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminHome from '@/pages/admin/AdminHome';
import Categories from '@/pages/admin/Categories';
import ProductList from '@/pages/admin/ProductList';
import ProductEdit from '@/pages/admin/ProductEdit';
import Inventory from '@/pages/admin/Inventory';
import Coupons from '@/pages/admin/Coupons';
import DeliveryZones from '@/pages/admin/DeliveryZones';
import ShippingSettings from '@/pages/admin/ShippingSettings';
import PaymentSettings from '@/pages/admin/PaymentSettings';
import PaymentVerification from '@/pages/admin/PaymentVerification';
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
    <AuthProvider>
    <WishlistProvider>
    <CartProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* Catalogue (live Supabase data) */}
        <Route path="shop" element={<ShopAll />} />
        <Route path="women" element={<GenderPage gender="women" />} />
        <Route path="men" element={<GenderPage gender="men" />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="product/:slug" element={<ProductPage />} />

        {/* Commerce (later phases) */}
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />
        <Route path="track-order" element={<Scaffold title="Order Tracking" phase={7} phaseLabel="Orders" description="Order tracking is built in Phase 7." />} />

        {/* Authentication */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Customer account (signed-in only) */}
        <Route path="account" element={<RequireAuth />}>
          <Route element={<AccountLayout />}>
            <Route index element={<Overview />} />
            <Route path="profile" element={<Profile />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="orders" element={<Scaffold embedded title="My Orders" phase={7} phaseLabel="Orders" description="Order history is built in Phase 7." />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Route>
        </Route>

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
      {/* Admin (staff only; own layout, no storefront chrome) */}
      <Route path="admin" element={<RequireStaff />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route element={<RequireSection section="products" />}>
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductEdit />} />
            <Route path="products/:id" element={<ProductEdit />} />
          </Route>
          <Route element={<RequireSection section="categories" />}>
            <Route path="categories" element={<Categories />} />
          </Route>
          <Route element={<RequireSection section="inventory" />}>
            <Route path="inventory" element={<Inventory />} />
          </Route>
          <Route element={<RequireSection section="coupons" />}>
            <Route path="coupons" element={<Coupons />} />
          </Route>
          <Route element={<RequireSection section="delivery-zones" />}>
            <Route path="delivery-zones" element={<DeliveryZones />} />
          </Route>
          <Route element={<RequireSection section="shipping-settings" />}>
            <Route path="shipping-settings" element={<ShippingSettings />} />
          </Route>
          <Route element={<RequireSection section="payment-settings" />}>
            <Route path="payment-settings" element={<PaymentSettings />} />
          </Route>
          <Route element={<RequireSection section="payment-verification" />}>
            <Route path="payment-verification" element={<PaymentVerification />} />
          </Route>
          <Route path="*" element={<AdminHome />} />
        </Route>
      </Route>
    </Routes>
    </CartProvider>
    </WishlistProvider>
    </AuthProvider>
  );
}
