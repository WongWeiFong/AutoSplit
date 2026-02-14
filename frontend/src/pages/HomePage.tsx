
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  Users,
  Zap,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Smartphone,
  Star
} from 'lucide-react';

const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="font-sans text-gray-900 bg-white selection:bg-indigo-100 selection:text-indigo-700">

      {/* ================= NAVBAR ================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">
              AutoSplit
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-indigo-600 transition-colors">Stories</a>
            <Link
              to="/login"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 flex items-center gap-2">
              Get Started <ArrowRight size={16} />
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 shadow-xl animate-fade-in">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>How It Works</a>
              <Link to="/login" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
              <Link
                to="/login"
                className="bg-indigo-600 text-white px-5 py-3 rounded-lg text-center font-medium shadow-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none mix-blend-multiply filter" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-50/50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none mix-blend-multiply filter" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Join 10,000+ smart splitters
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-8">
              Split bills without <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                awkward math.
              </span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-lg">
              Track shared expenses, settle debts instantly, and keep your friendships drama-free. The easiest way to manage money with friends.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Start Splitting Free <ArrowRight size={20} />
              </Link>
              <a
                href="#how-it-works"
                className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-gray-500 font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-indigo-${i * 100 + 200}`} />
                ))}
              </div>
              <span>Trust by 5,000+ groups worldwide</span>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative lg:h-[600px] w-full flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Abstract Placeholder for App Screenshot */}
            <div className="relative w-full max-w-[500px] aspect-[4/5] bg-white rounded-[2.5rem] shadow-2xl border-8 border-gray-900 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700">
              {/* Fake UI Header */}
              <div className="h-14 bg-gray-50 border-b flex items-center justify-between px-6">
                <div className="w-16 h-4 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>

              {/* Fake UI Content */}
              <div className="p-6 space-y-6">
                <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200 text-center">
                  <p className="text-indigo-100 text-sm font-medium mb-1">Total Balance</p>
                  <h3 className="text-4xl font-bold tracking-tight">+$450.00</h3>
                  <div className="mt-4 flex justify-center gap-2">
                    <div className="h-1 w-12 bg-white/20 rounded-full"></div>
                    <div className="h-1 w-2 bg-white/20 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl">🍕</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Pizza Night</h4>
                      <p className="text-xs text-gray-500">Paid by Alex</p>
                    </div>
                    <span className="font-bold text-red-500 font-mono">-$24.50</span>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">✈️</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Flight Tickets</h4>
                      <p className="text-xs text-gray-500">You paid $400</p>
                    </div>
                    <span className="font-bold text-green-600 font-mono">+$200.00</span>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xl">🏠</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Utilities</h4>
                      <p className="text-xs text-gray-500">Paid by Sarah</p>
                    </div>
                    <span className="font-bold text-red-500 font-mono">-$45.20</span>
                  </div>
                </div>

                {/* Floating Add Button */}
                <div className="absolute bottom-8 right-8 w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                  <span className="text-3xl font-light mb-1">+</span>
                </div>
              </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="absolute top-1/2 -left-20 w-32 h-32 bg-indigo-600 rounded-full blur-3xl opacity-10"></div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES GRID ================= */}
      <section id="features" className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase mb-3">Features</h2>
            <h3 className="text-4xl font-bold text-gray-900 mb-6">Everything you need to settle up.</h3>
            <p className="text-lg text-gray-600">
              Powerful tools designed for modern shared finances. Whether it's a weekend trip or monthly rent, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BarChart3 className="text-white" size={24} />}
              title="Expense Tracking"
              desc="Monitor personal and group spending in real-time with beautiful charts and categories."
              color="bg-purple-600"
            />
            <FeatureCard
              icon={<Users className="text-white" size={24} />}
              title="Group Management"
              desc="Create unlimited groups for trips, roommates, events, and everyday life."
              color="bg-indigo-600"
            />
            <FeatureCard
              icon={<Zap className="text-white" size={24} />}
              title="Instant Balance"
              desc="Our algorithm automatically calculates the simplest way to settle debts."
              color="bg-pink-600"
            />
            <FeatureCard
              icon={<CreditCard className="text-white" size={24} />}
              title="Receipt Scanning"
              desc="Snap a photo of your receipt and let our AI extract all the items for you."
              color="bg-orange-500"
            />
            <FeatureCard
              icon={<ShieldCheck className="text-white" size={24} />}
              title="Secure & Private"
              desc="Your financial data is encrypted and safe. We never sell your personal information."
              color="bg-emerald-500"
            />
            <FeatureCard
              icon={<Smartphone className="text-white" size={24} />}
              title="Mobile First"
              desc="Access your expenses anywhere, anytime. Optimized for every device."
              color="bg-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                Settling up made simple.
              </h2>

              <Step
                num="01"
                title="Create a Group"
                desc="Add your friends, roommates, or travel buddies to a shared workspace in seconds."
              />
              <Step
                num="02"
                title="Add Expenses"
                desc="Upload receipts or manually enter bills. Split equally or by exact amounts."
              />
              <Step
                num="03"
                title="Settle Up"
                desc="See exactly who owes what and settle payments with a single tap."
              />
            </div>

            <div className="bg-gray-100 rounded-3xl p-8 min-h-[400px] flex items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 bg-pattern opacity-5"></div>
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full transform rotate-3 transition-transform hover:rotate-0 duration-500">
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <h4 className="font-bold text-gray-900">Trip Summary</h4>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Settle Up</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">JD</div>
                      <span className="text-sm font-medium text-gray-700">John Doe</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">+$120.00</span>
                  </div>
                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-xs">AS</div>
                      <span className="text-sm font-medium text-gray-700">Alice Smith</span>
                    </div>
                    <span className="text-sm font-bold text-red-500">-$45.00</span>
                  </div>
                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">MK</div>
                      <span className="text-sm font-medium text-gray-700">Mike K.</span>
                    </div>
                    <span className="text-sm font-bold text-red-500">-$75.00</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section id="testimonials" className="py-24 bg-indigo-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 text-yellow-400">
              <Star fill="currentColor" size={24} />
              <Star fill="currentColor" size={24} />
              <Star fill="currentColor" size={24} />
              <Star fill="currentColor" size={24} />
              <Star fill="currentColor" size={24} />
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8">
            "This app saved my friendship during our Europe trip. No more arguments about who paid for dinner."
          </h2>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full mb-4 border-4 border-indigo-700 mx-auto overflow-hidden">
              {/* Avatar placeholder */}
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 font-bold text-2xl">S</div>
            </div>
            <h4 className="font-bold text-lg">Sarah Jenkins</h4>
            <p className="text-indigo-300">Travel Enthusiast</p>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 bg-white relative">
        <div className="max-w-5xl mx-auto px-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2.5rem] p-12 md:p-20 text-center shadow-2xl text-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-20 mix-blend-overlay"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to simplify shared expenses?
            </h2>
            <p className="text-lg md:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              Join thousands of users who are saving time and money with AutoSplit.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Zap size={16} fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-gray-900">AutoSplit</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              The easiest way to track expenses and settle debts with friends, roommates, and family.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a href="#" className="hover:text-indigo-600">Features</a></li>
              <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
              <li><a href="#" className="hover:text-indigo-600">Integrations</a></li>
              <li><a href="#" className="hover:text-indigo-600">Updates</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a href="#" className="hover:text-indigo-600">Community</a></li>
              <li><a href="#" className="hover:text-indigo-600">Help Center</a></li>
              <li><a href="#" className="hover:text-indigo-600">Blog</a></li>
              <li><a href="#" className="hover:text-indigo-600">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a href="#" className="hover:text-indigo-600">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-600">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} AutoSplit Inc. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-gray-900">Twitter</a>
            <a href="#" className="hover:text-gray-900">Instagram</a>
            <a href="#" className="hover:text-gray-900">LinkedIn</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

// Helper Components
const FeatureCard = ({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">{title}</h3>
    <p className="text-gray-600 leading-relaxed text-sm">
      {desc}
    </p>
  </div>
);

const Step = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
  <div className="flex gap-6 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
      {num}
    </div>
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {desc}
      </p>
    </div>
  </div>
);

export default HomePage;
