import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import { SiteContentProvider } from '@/context/SiteContentContext';
import { Suspense, lazy } from 'react';
import { RequireAuth, RequireSection, RequireStaff } from '@/components/auth/Guards';
import { Layout } from '@/components/layout/Layout';
import Home from '@/pages/Home';

// Everything except the homepage shell loads on demand, so first paint downloads far less code.
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const TrackOrder = lazy(() => import('@/pages/TrackOrder'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Wishlist = lazy(() => import('@/pages/account/Wishlist'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout'));
const Overview = lazy(() => import('@/pages/account/Overview'));
const Profile = lazy(() => import('@/pages/account/Profile'));
const Addresses = lazy(() => import('@/pages/account/Addresses'));
const AccountOrders = lazy(() => import('@/pages/account/Orders'));
const AccountOrderDetail = lazy(() => import('@/pages/account/OrderDetail'));
const listing = () => import('@/pages/Listing');
const CategoryPage = lazy(() => listing().then((m) => ({ default: m.CategoryPage })));
const CollectionPage = lazy(() => listing().then((m) => ({ default: m.CollectionPage })));
const GenderPage = lazy(() => listing().then((m) => ({ default: m.GenderPage })));
const SearchPage = lazy(() => listing().then((m) => ({ default: m.SearchPage })));
const ShopAll = lazy(() => listing().then((m) => ({ default: m.ShopAll })));
const info = () => import('@/pages/StaticPages');
const AboutPage = lazy(() => info().then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => info().then((m) => ({ default: m.ContactPage })));
const FaqPage = lazy(() => info().then((m) => ({ default: m.FaqPage })));
const PrivacyPage = lazy(() => info().then((m) => ({ default: m.PrivacyPage })));
const RefundPage = lazy(() => info().then((m) => ({ default: m.RefundPage })));
const ShippingPage = lazy(() => info().then((m) => ({ default: m.ShippingPage })));
const TermsPage = lazy(() => info().then((m) => ({ default: m.TermsPage })));

// admin (staff only; never downloaded by shoppers)
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const Categories = lazy(() => import('@/pages/admin/Categories'));
const ProductList = lazy(() => import('@/pages/admin/ProductList'));
const ProductEdit = lazy(() => import('@/pages/admin/ProductEdit'));
const Inventory = lazy(() => import('@/pages/admin/Inventory'));
const Coupons = lazy(() => import('@/pages/admin/Coupons'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/OrderDetail'));
const DeliveryZones = lazy(() => import('@/pages/admin/DeliveryZones'));
const ShippingSettings = lazy(() => import('@/pages/admin/ShippingSettings'));
const PaymentSettings = lazy(() => import('@/pages/admin/PaymentSettings'));
const PaymentVerification = lazy(() => import('@/pages/admin/PaymentVerification'));
const content = () => import('@/pages/admin/ContentScreens');
const Banners = lazy(() => content().then((m) => ({ default: m.Banners })));
const HeroSlides = lazy(() => content().then((m) => ({ default: m.HeroSlides })));
const HomepageBuilder = lazy(() => content().then((m) => ({ default: m.HomepageBuilder })));
const WebsitePages = lazy(() => content().then((m) => ({ default: m.WebsitePages })));
const NavigationMenu = lazy(() => content().then((m) => ({ default: m.NavigationMenu })));
const ops = () => import('@/pages/admin/OpsScreens');
const Dashboard = lazy(() => ops().then((m) => ({ default: m.Dashboard })));
const WebsiteSettings = lazy(() => ops().then((m) => ({ default: m.WebsiteSettings })));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const SeoSettings = lazy(() => ops().then((m) => ({ default: m.SeoSettings })));
const Reviews = lazy(() => ops().then((m) => ({ default: m.Reviews })));
const Newsletter = lazy(() => ops().then((m) => ({ default: m.Newsletter })));
const Messages = lazy(() => ops().then((m) => ({ default: m.Messages })));
const Customers = lazy(() => ops().then((m) => ({ default: m.Customers })));
const AdminUsers = lazy(() => ops().then((m) => ({ default: m.AdminUsers })));
const RolesPermissions = lazy(() => ops().then((m) => ({ default: m.RolesPermissions })));
const ActivityLogs = lazy(() => ops().then((m) => ({ default: m.ActivityLogs })));

const Fallback = () => <p role="status" className="container-page py-16 text-sm text-muted">Loading…</p>;

export default function App() {
  return (
    <AuthProvider>
    <WishlistProvider>
    <SiteContentProvider>
    <CartProvider>
    <Suspense fallback={<Fallback />}>
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
        <Route path="track-order" element={<TrackOrder />} />

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
            <Route path="orders" element={<AccountOrders />} />
            <Route path="orders/:orderNumber" element={<AccountOrderDetail />} />
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
          <Route index element={<Dashboard />} />
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
          <Route element={<RequireSection section="orders" />}>
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
          </Route>
          <Route element={<RequireSection section="banners" />}>
            <Route path="banners" element={<Banners />} />
          </Route>
          <Route element={<RequireSection section="homepage-builder" />}>
            <Route path="homepage-builder" element={<HomepageBuilder />} />
          </Route>
          <Route element={<RequireSection section="hero-slider" />}>
            <Route path="hero-slider" element={<HeroSlides />} />
          </Route>
          <Route element={<RequireSection section="website-pages" />}>
            <Route path="website-pages" element={<WebsitePages />} />
          </Route>
          <Route element={<RequireSection section="navigation-menu" />}>
            <Route path="navigation-menu" element={<NavigationMenu />} />
          </Route>
          <Route element={<RequireSection section="website-settings" />}>
            <Route path="website-settings" element={<WebsiteSettings />} />
          </Route>
          <Route element={<RequireSection section="seo-settings" />}>
            <Route path="seo-settings" element={<SeoSettings />} />
          </Route>
          <Route element={<RequireSection section="reports" />}>
            <Route path="reports" element={<Reports />} />
          </Route>
          <Route element={<RequireSection section="reviews" />}>
            <Route path="reviews" element={<Reviews />} />
          </Route>
          <Route element={<RequireSection section="newsletter" />}>
            <Route path="newsletter" element={<Newsletter />} />
          </Route>
          <Route element={<RequireSection section="messages" />}>
            <Route path="messages" element={<Messages />} />
          </Route>
          <Route element={<RequireSection section="customers" />}>
            <Route path="customers" element={<Customers />} />
          </Route>
          <Route element={<RequireSection section="admin-users" />}>
            <Route path="admin-users" element={<AdminUsers />} />
          </Route>
          <Route element={<RequireSection section="roles-permissions" />}>
            <Route path="roles-permissions" element={<RolesPermissions />} />
          </Route>
          <Route element={<RequireSection section="activity-logs" />}>
            <Route path="activity-logs" element={<ActivityLogs />} />
          </Route>
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
    </CartProvider>
    </SiteContentProvider>
    </WishlistProvider>
    </AuthProvider>
  );
}
