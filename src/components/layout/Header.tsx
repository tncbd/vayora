import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useNavItems } from '@/hooks/useCategories';
import { useCart } from '@/context/CartContext';
import { MobileNav } from './MobileNav';
import { SearchOverlay } from './SearchOverlay';

const iconBtn = 'relative p-2 text-primary transition-colors hover:text-accent-dark';

export function Header() {
  const navItems = useNavItems();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <div className="flex flex-1 items-center lg:hidden">
          <button className={iconBtn} onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>

        <Link to="/" className="flex flex-col items-center leading-none lg:items-start" aria-label="VAYORA FASHION home">
          <span className="font-display text-2xl font-semibold tracking-[0.12em] text-primary sm:text-3xl">VAYORA</span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.5em] text-accent-dark">Fashion</span>
        </Link>

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Main">
          <ul className="flex items-center gap-9">
            {navItems.map((item) => (
              <li key={item.label} className="group relative">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `link-underline py-7 text-xs font-medium uppercase tracking-[0.18em] ${isActive ? 'text-accent-dark' : 'text-primary'}`
                  }
                >
                  {item.label}
                </NavLink>
                {item.children && (
                  <div className="invisible absolute left-1/2 top-full z-10 w-64 -translate-x-1/2 border border-line bg-white p-5 opacity-0 shadow-lg transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="space-y-2.5">
                      {item.children.map((c) => (
                        <li key={c.to}>
                          <Link to={c.to} className="text-sm text-ink transition-colors hover:text-accent-dark">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                      <li className="border-t border-line pt-2.5">
                        <Link to={item.to} className="text-xs font-medium uppercase tracking-widest text-accent-dark">
                          View all
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1.5 lg:flex-none">
          <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search size={20} />
          </button>
          <Link to="/account/wishlist" className={`${iconBtn} hidden sm:inline-flex`} aria-label="Wishlist">
            <Heart size={20} />
          </Link>
          <Link to="/account" className={`${iconBtn} hidden sm:inline-flex`} aria-label="My account">
            <User size={20} />
          </Link>
          <Link to="/cart" className={iconBtn} aria-label={count > 0 ? `Shopping cart, ${count} items` : 'Shopping cart'}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">{count > 99 ? '99+' : count}</span>
            )}
          </Link>
        </div>
      </div>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
