import { Link } from 'react-router-dom';
import { useWishlist } from '@/context/WishlistContext';
import { useAsync } from '@/hooks/useAsync';
import { getProductsByIds } from '@/lib/catalogApi';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';

export default function Wishlist() {
  const { ids, loading: idsLoading } = useWishlist();
  const key = [...ids].sort().join(',');
  const { data, loading, error } = useAsync(() => getProductsByIds([...ids]), [key]);

  return (
    <div>
      <h2 className="text-2xl font-medium">My Wishlist</h2>
      <div className="mt-6">
        {error ? (
          <p role="alert" className="text-sm text-red-700">Could not load your wishlist.</p>
        ) : idsLoading || (loading && !data) ? (
          <ProductGridSkeleton count={4} cols={3} />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="border border-line p-8 text-center text-sm text-muted">
            Your wishlist is empty. <Link to="/shop" className="link-underline font-medium text-primary">Browse products</Link> and tap the heart to save them here.
          </div>
        ) : (
          <ProductGrid items={data!} cols={3} />
        )}
      </div>
    </div>
  );
}
