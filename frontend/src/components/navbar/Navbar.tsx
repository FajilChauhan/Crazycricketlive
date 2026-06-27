// components/navbar/Navbar.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Trophy, PlusCircle, UserCircle, LogIn, UserPlus,
  LogOut, Search, Menu, X
} from "lucide-react";
import { useAppSelector } from "../../hooks/useAppSelector";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { logout } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const Navbar = () => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out");
    navigate("/");
  };

  // Close mobile drawer on route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const NavLink = ({
    to, icon, label, onClick,
  }: {
    to: string; icon: React.ReactNode; label?: string; onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive(to)
          ? "text-white bg-white/[0.08]"
          : "text-white/50 hover:text-white/85 hover:bg-white/[0.06]"}`}
    >
      {icon}
      {label && <span>{label}</span>}
    </Link>
  );

  return (
    <>
      <header className="bg-[#0a0a0a] border-b border-white/[0.08] h-14 sm:h-16 flex items-center px-4 sm:px-6 lg:px-8 sticky top-0 z-50 touch-manipulation">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0">
              🏏
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold text-[16px] tracking-tight leading-none">
                CrazyCricketLive
              </h1>
              <p className="text-white/35 text-[10px] mt-0.5">Live matches · Tournaments</p>
            </div>
            <span className="text-white font-semibold text-[15px] tracking-tight sm:hidden">
              CrazyCricketLive
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavLink to="/search" icon={<Search size={16} />} />
            <NavLink to="/tournaments" icon={<Trophy size={16} />} label="Tournaments" />

            {isAuthenticated ? (
              <>
                <Link
                  to="/create"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors ml-1"
                >
                  <PlusCircle size={16} />
                  Create
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white/85 hover:bg-white/[0.06] text-sm font-medium transition-colors ml-1"
                >
                  <UserCircle size={16} />
                  <span className="text-white/70 max-w-[100px] truncate">{user?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" icon={<LogIn size={16} />} label="Login" />
                <Link
                  to="/signup"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors ml-1"
                >
                  <UserPlus size={16} />
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile — right side controls */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              to="/search"
              className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              <Search size={18} />
            </Link>
            {isAuthenticated && (
              <Link
                to="/create"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
              >
                <PlusCircle size={15} />
                <span>Create</span>
              </Link>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.06] transition-colors ml-0.5"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 top-14">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          {/* Sheet */}
          <div className="absolute top-0 left-0 right-0 bg-[#0f0f0f] border-b border-white/[0.08] px-4 py-4 space-y-1 shadow-2xl">

            <Link
              to="/tournaments"
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full
                \${isActive("/tournaments") ? "text-white bg-white/[0.08]" : "text-white/55 hover:text-white/85 hover:bg-white/[0.05]"}`}
            >
              <Trophy size={17} className="flex-shrink-0" />
              Tournaments
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full
                    \${isActive("/profile") ? "text-white bg-white/[0.08]" : "text-white/55 hover:text-white/85 hover:bg-white/[0.05]"}`}
                >
                  <UserCircle size={17} className="flex-shrink-0" />
                  <span className="truncate">{user?.username}</span>
                  <span className="ml-auto text-white/25 text-xs">Profile</span>
                </Link>

                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-colors w-full"
                  >
                    <LogOut size={17} className="flex-shrink-0" />
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full
                    \${isActive("/login") ? "text-white bg-white/[0.08]" : "text-white/55 hover:text-white/85 hover:bg-white/[0.05]"}`}
                >
                  <LogIn size={17} className="flex-shrink-0" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/15 transition-colors w-full"
                >
                  <UserPlus size={17} className="flex-shrink-0" />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;