import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-custom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Rocket, Send, Paperclip, X, Loader2, Download,
  FileCode, FolderOpen, Brain, Sparkles, Code2, Check,
  Monitor, Tablet, Smartphone, Maximize2, Minimize2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FeatureHistorySidebar, { type HistoryItem } from "@/components/FeatureHistorySidebar";
import { setPageMeta } from "@/lib/seo";
import { useIsMobile } from "@/hooks/use-mobile";

/* ───── Types ───── */
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
};

type Framework = "nextjs" | "react" | "html";
type Viewport = "desktop" | "tablet" | "mobile";

const viewportWidths: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

/* ───── Helpers ───── */
function detectFramework(text: string): Framework {
  const lower = text.toLowerCase();
  if (lower.includes("react") && !lower.includes("next")) return "react";
  if (lower.includes("html") || lower.includes("static site") || lower.includes("vanilla")) return "html";
  return "nextjs";
}

/* ═══════════════════════════════════════════
   Inline sub-components
   ═══════════════════════════════════════════ */

/* ── Prompt Chips ── */
const PROMPT_CHIPS = [
  { label: "🛒 E-Commerce Store", prompt: "Build a modern e-commerce store with a product listing page, product detail page, shopping cart, and checkout flow. Use Next.js with Tailwind CSS. Include a hero banner, category filters, and a responsive navigation bar." },
  { label: "📊 Admin Dashboard", prompt: "Create a professional admin dashboard with sidebar navigation, analytics cards showing key metrics, a line chart for revenue trends, a recent orders table, and a user management section. Use React with Tailwind CSS and Recharts." },
  { label: "📝 Blog Platform", prompt: "Build a clean blog platform with a homepage listing blog posts as cards, a single post view with rich typography, a category sidebar, and a newsletter signup section. Use Next.js with Tailwind CSS." },
  { label: "🍕 Restaurant Website", prompt: "Create a restaurant landing page with a hero section featuring a food image, a menu section with categories and items with prices, an about section, customer reviews, and a reservation form. Use HTML/CSS with modern design." },
  { label: "💼 Portfolio Site", prompt: "Build a personal portfolio website with a hero section, projects showcase grid with hover effects, skills section, work experience timeline, and a contact form. Use React with Tailwind CSS and Framer Motion animations." },
  { label: "📱 SaaS Landing Page", prompt: "Create a SaaS landing page with a gradient hero section, feature cards with icons, pricing table with 3 tiers, testimonials carousel, FAQ accordion, and a call-to-action footer. Use Next.js with Tailwind CSS." },
];

/* ── Example Apps ── */
const EXAMPLE_APPS: { title: string; description: string; pattern: string; framework: Framework; previewHtml: string }[] = [
  {
    title: "ShopWave Store",
    description: "Full-stack e-commerce with cart, checkout & product pages",
    pattern: "store",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShopWave</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}.page{display:none}.page.active{display:block}nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#1e293b;border-bottom:1px solid #334155;position:sticky;top:0;z-index:10}.logo{font-size:20px;font-weight:700;background:linear-gradient(90deg,#6366f1,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer}.nav-links{display:flex;gap:24px;font-size:13px;color:#94a3b8}.nav-links span{cursor:pointer;transition:color .2s}.nav-links span:hover,.nav-links span.active{color:#e2e8f0}.cart-btn{background:#6366f1;color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;position:relative}.cart-count{background:#ef4444;color:#fff;font-size:9px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:absolute;top:-5px;right:-5px}.hero{padding:48px 24px;text-align:center;background:linear-gradient(135deg,#1e1b4b,#0f172a)}.hero h1{font-size:36px;font-weight:800;margin-bottom:12px}.hero p{color:#94a3b8;margin-bottom:24px;font-size:14px;max-width:500px;margin:0 auto 24px}.hero-btn{background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:transform .2s}.hero-btn:hover{transform:scale(1.05)}.section{padding:40px 24px;max-width:900px;margin:0 auto}.section-title{font-size:22px;font-weight:700;margin-bottom:24px}.products{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.product{background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;transition:transform .2s,border-color .2s}.product:hover{transform:translateY(-4px);border-color:#6366f1}.product-img{height:100px;background:linear-gradient(135deg,#312e81,#1e3a5f);display:flex;align-items:center;justify-content:center;font-size:36px}.product-info{padding:14px}.product-name{font-size:14px;font-weight:600;margin-bottom:4px}.product-price{color:#818cf8;font-weight:700;font-size:16px;margin-bottom:8px}.add-btn{width:100%;background:#6366f1;color:#fff;border:none;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background .2s}.add-btn:hover{background:#4f46e5}.added{background:#22c55e!important}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}.feature{background:#1e293b;border-radius:12px;padding:16px;text-align:center;border:1px solid #334155}.feature-icon{font-size:24px;margin-bottom:6px}.feature h3{font-size:13px;font-weight:600}.feature p{color:#94a3b8;font-size:11px}footer{background:#1e293b;border-top:1px solid #334155;padding:24px;text-align:center;color:#475569;font-size:11px;margin-top:32px}.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}.modal-overlay.open{display:flex}.modal{background:#1e293b;border-radius:16px;padding:24px;width:90%;max-width:400px;border:1px solid #334155}.modal h2{font-size:18px;margin-bottom:16px}.modal-close{background:#334155;color:#e2e8f0;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;margin-top:12px}.cart-items{max-height:200px;overflow-y:auto}.cart-item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155;font-size:13px}.cart-total{font-size:16px;font-weight:700;margin-top:12px;text-align:right;color:#818cf8}.checkout-btn{width:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px}.deals-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.deal{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center}.deal-badge{background:#ef4444;color:#fff;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:8px}.deal-icon{font-size:36px;margin-bottom:8px}.deal-old{text-decoration:line-through;color:#64748b;font-size:12px;margin-right:6px}.deal-new{color:#22c55e;font-weight:700;font-size:16px}.toast{position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><nav><span class="logo" onclick="showPage('home')">ShopWave</span><div class="nav-links"><span class="active" onclick="showPage('home')">Home</span><span onclick="showPage('products')">Products</span><span onclick="showPage('deals')">Deals</span></div><button class="cart-btn" onclick="openCart()">🛒 Cart <span class="cart-count" id="cartCount">0</span></button></nav><div id="page-home" class="page active"><div class="hero"><h1>Discover Premium Products</h1><p>Shop the latest trends with free shipping over $50</p><button class="hero-btn" onclick="showPage('products')">Shop Now →</button></div><div class="section"><div class="section-title">Trending Products</div><div class="products"><div class="product"><div class="product-img">👟</div><div class="product-info"><div class="product-name">Ultra Boost Sneakers</div><div class="product-price">$89</div><button class="add-btn" onclick="addToCart(this,'Ultra Boost Sneakers',89)">Add to Cart</button></div></div><div class="product"><div class="product-img">🎧</div><div class="product-info"><div class="product-name">Wireless Headphones</div><div class="product-price">$149</div><button class="add-btn" onclick="addToCart(this,'Wireless Headphones',149)">Add to Cart</button></div></div><div class="product"><div class="product-img">⌚</div><div class="product-info"><div class="product-name">Smart Watch X</div><div class="product-price">$299</div><button class="add-btn" onclick="addToCart(this,'Smart Watch X',299)">Add to Cart</button></div></div></div><div class="features"><div class="feature"><div class="feature-icon">🚚</div><h3>Free Shipping</h3><p>Orders over $50</p></div><div class="feature"><div class="feature-icon">🔒</div><h3>Secure Pay</h3><p>256-bit SSL</p></div><div class="feature"><div class="feature-icon">↩️</div><h3>Easy Returns</h3><p>30-day policy</p></div></div></div></div><div id="page-products" class="page"><div class="section"><div class="section-title">All Products</div><div class="products"><div class="product"><div class="product-img">👟</div><div class="product-info"><div class="product-name">Ultra Boost Sneakers</div><div class="product-price">$89</div><button class="add-btn" onclick="addToCart(this,'Ultra Boost Sneakers',89)">Add to Cart</button></div></div><div class="product"><div class="product-img">🎧</div><div class="product-info"><div class="product-name">Wireless Headphones</div><div class="product-price">$149</div><button class="add-btn" onclick="addToCart(this,'Wireless Headphones',149)">Add to Cart</button></div></div><div class="product"><div class="product-img">⌚</div><div class="product-info"><div class="product-name">Smart Watch X</div><div class="product-price">$299</div><button class="add-btn" onclick="addToCart(this,'Smart Watch X',299)">Add to Cart</button></div></div><div class="product"><div class="product-img">🎒</div><div class="product-info"><div class="product-name">Travel Backpack</div><div class="product-price">$65</div><button class="add-btn" onclick="addToCart(this,'Travel Backpack',65)">Add to Cart</button></div></div><div class="product"><div class="product-img">📱</div><div class="product-info"><div class="product-name">Phone Case Pro</div><div class="product-price">$29</div><button class="add-btn" onclick="addToCart(this,'Phone Case Pro',29)">Add to Cart</button></div></div><div class="product"><div class="product-img">🕶️</div><div class="product-info"><div class="product-name">Designer Sunglasses</div><div class="product-price">$120</div><button class="add-btn" onclick="addToCart(this,'Designer Sunglasses',120)">Add to Cart</button></div></div></div></div></div><div id="page-deals" class="page"><div class="section"><div class="section-title">🔥 Hot Deals</div><div class="deals-grid"><div class="deal"><div class="deal-badge">-40%</div><div class="deal-icon">🎧</div><div class="product-name">Wireless Headphones</div><div><span class="deal-old">$149</span><span class="deal-new">$89</span></div><button class="add-btn" style="margin-top:10px;width:auto;padding:6px 20px" onclick="addToCart(this,'Wireless Headphones (Deal)',89)">Grab Deal</button></div><div class="deal"><div class="deal-badge">-25%</div><div class="deal-icon">⌚</div><div class="product-name">Smart Watch X</div><div><span class="deal-old">$299</span><span class="deal-new">$224</span></div><button class="add-btn" style="margin-top:10px;width:auto;padding:6px 20px" onclick="addToCart(this,'Smart Watch X (Deal)',224)">Grab Deal</button></div><div class="deal"><div class="deal-badge">-50%</div><div class="deal-icon">🕶️</div><div class="product-name">Designer Sunglasses</div><div><span class="deal-old">$120</span><span class="deal-new">$60</span></div><button class="add-btn" style="margin-top:10px;width:auto;padding:6px 20px" onclick="addToCart(this,'Designer Sunglasses (Deal)',60)">Grab Deal</button></div><div class="deal"><div class="deal-badge">-30%</div><div class="deal-icon">🎒</div><div class="product-name">Travel Backpack</div><div><span class="deal-old">$65</span><span class="deal-new">$45</span></div><button class="add-btn" style="margin-top:10px;width:auto;padding:6px 20px" onclick="addToCart(this,'Travel Backpack (Deal)',45)">Grab Deal</button></div></div></div></div><div class="modal-overlay" id="cartModal"><div class="modal"><h2>🛒 Your Cart</h2><div class="cart-items" id="cartItems"></div><div class="cart-total" id="cartTotal"></div><button class="checkout-btn" onclick="checkout()">Checkout →</button><button class="modal-close" onclick="closeCart()">Continue Shopping</button></div></div><div class="toast" id="toast"></div><footer>© 2026 ShopWave. All rights reserved.</footer><script>let cart=[];function showPage(p){document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-links span').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase()===p||(p==='home'&&e.textContent==='Home'))e.classList.add('active')});window.scrollTo(0,0)}function addToCart(btn,name,price){cart.push({name,price});document.getElementById('cartCount').textContent=cart.length;btn.textContent='✓ Added';btn.classList.add('added');setTimeout(()=>{btn.textContent='Add to Cart';btn.classList.remove('added')},1200);showToast(name+' added to cart!')}function openCart(){const el=document.getElementById('cartItems');if(cart.length===0){el.innerHTML='<p style="color:#94a3b8;text-align:center;padding:20px">Your cart is empty</p>'}else{el.innerHTML=cart.map((c,i)=>'<div class="cart-item"><span>'+c.name+'</span><span>$'+c.price+'</span></div>').join('')}const total=cart.reduce((s,c)=>s+c.price,0);document.getElementById('cartTotal').textContent='Total: $'+total;document.getElementById('cartModal').classList.add('open')}function closeCart(){document.getElementById('cartModal').classList.remove('open')}function checkout(){if(cart.length===0)return;cart=[];document.getElementById('cartCount').textContent='0';closeCart();showToast('Order placed successfully! 🎉')}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "Pulse Dashboard",
    description: "Analytics dashboard with charts, stats & user management",
    pattern: "dashboard",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;height:100vh;overflow:hidden}.sidebar{width:200px;background:#1e293b;border-right:1px solid #334155;padding:16px;flex-shrink:0}.sidebar-logo{font-size:18px;font-weight:700;margin-bottom:20px;background:linear-gradient(90deg,#6366f1,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:13px;color:#94a3b8;margin-bottom:2px;cursor:pointer;transition:all .2s}.sidebar-item:hover{background:#334155;color:#e2e8f0}.sidebar-item.active{background:#6366f1;color:#fff}.main{flex:1;overflow-y:auto;padding:20px}.view{display:none}.view.active{display:block}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.topbar h1{font-size:20px;font-weight:700}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.stat-card{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;cursor:pointer;transition:border-color .2s}.stat-card:hover{border-color:#6366f1}.stat-label{font-size:11px;color:#64748b;margin-bottom:4px}.stat-value{font-size:22px;font-weight:700}.stat-up{font-size:11px;color:#22c55e;margin-top:2px}.chart-card{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;margin-bottom:16px}.chart-title{font-size:14px;font-weight:600;margin-bottom:12px}.chart-bars{display:flex;align-items:flex-end;gap:6px;height:100px}.chart-bar{flex:1;border-radius:3px 3px 0 0;background:linear-gradient(180deg,#6366f1,#4338ca);transition:opacity .2s;cursor:pointer}.chart-bar:hover{opacity:.7}.table-card{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155}.table-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:8px 0;font-size:12px;border-bottom:1px solid #1e293b;align-items:center}.table-header{color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-size:10px;border-bottom:1px solid #334155}.status{padding:2px 8px;border-radius:999px;font-size:10px}.s-active{background:rgba(34,197,94,.15);color:#22c55e}.s-pending{background:rgba(245,158,11,.15);color:#f59e0b}.s-inactive{background:rgba(239,68,68,.15);color:#ef4444}.action-btn{background:#334155;color:#e2e8f0;border:none;padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer}.action-btn:hover{background:#6366f1}.settings-form{max-width:400px}.form-group{margin-bottom:16px}.form-group label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}.form-input{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:8px;font-size:13px}.form-input:focus{outline:none;border-color:#6366f1}.save-btn{background:#6366f1;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}.toggle{width:36px;height:20px;background:#334155;border-radius:999px;position:relative;cursor:pointer;transition:background .2s}.toggle.on{background:#6366f1}.toggle-dot{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left .2s}.toggle.on .toggle-dot{left:18px}.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.product-card{background:#1e293b;border-radius:12px;padding:14px;border:1px solid #334155;text-align:center}.product-emoji{font-size:28px;margin-bottom:6px}.product-name{font-size:13px;font-weight:600}.product-stock{font-size:11px;color:#94a3b8;margin-top:2px}.toast{position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><div class="sidebar"><div class="sidebar-logo">⚡ Pulse</div><div class="sidebar-item active" onclick="showView('dashboard')">📊 Dashboard</div><div class="sidebar-item" onclick="showView('users')">👥 Users</div><div class="sidebar-item" onclick="showView('products')">📦 Products</div><div class="sidebar-item" onclick="showView('billing')">💳 Billing</div><div class="sidebar-item" onclick="showView('settings')">⚙️ Settings</div></div><div class="main"><div id="view-dashboard" class="view active"><div class="topbar"><h1>Dashboard</h1></div><div class="stats"><div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">$48.2K</div><div class="stat-up">↑ 12.5%</div></div><div class="stat-card"><div class="stat-label">Users</div><div class="stat-value">2,847</div><div class="stat-up">↑ 8.3%</div></div><div class="stat-card"><div class="stat-label">Orders</div><div class="stat-value">1,024</div><div class="stat-up">↑ 5.1%</div></div><div class="stat-card"><div class="stat-label">Conversion</div><div class="stat-value">3.2%</div><div class="stat-up">↑ 0.8%</div></div></div><div class="chart-card"><div class="chart-title">Revenue Overview</div><div class="chart-bars"><div class="chart-bar" style="height:40%"></div><div class="chart-bar" style="height:65%"></div><div class="chart-bar" style="height:45%"></div><div class="chart-bar" style="height:80%"></div><div class="chart-bar" style="height:60%"></div><div class="chart-bar" style="height:90%"></div><div class="chart-bar" style="height:75%"></div><div class="chart-bar" style="height:95%"></div><div class="chart-bar" style="height:70%"></div><div class="chart-bar" style="height:85%"></div><div class="chart-bar" style="height:100%"></div><div class="chart-bar" style="height:88%"></div></div></div><div class="table-card"><div class="chart-title">Recent Users</div><div class="table-row table-header"><span>User</span><span>Status</span><span>Revenue</span><span>Action</span></div><div class="table-row"><span>Alice Smith</span><span class="status s-active">Active</span><span>$4,200</span><button class="action-btn" onclick="showToast('Viewing Alice\\'s profile')">View</button></div><div class="table-row"><span>Bob Jones</span><span class="status s-active">Active</span><span>$2,800</span><button class="action-btn" onclick="showToast('Viewing Bob\\'s profile')">View</button></div><div class="table-row"><span>Carol White</span><span class="status s-pending">Pending</span><span>$950</span><button class="action-btn" onclick="showToast('Viewing Carol\\'s profile')">View</button></div></div></div></div><div id="view-users" class="view"><div class="topbar"><h1>👥 User Management</h1></div><div class="table-card"><div class="table-row table-header"><span>User</span><span>Status</span><span>Revenue</span><span>Action</span></div><div class="table-row"><span>Alice Smith</span><span class="status s-active">Active</span><span>$4,200</span><button class="action-btn" onclick="showToast('User suspended')">Suspend</button></div><div class="table-row"><span>Bob Jones</span><span class="status s-active">Active</span><span>$2,800</span><button class="action-btn" onclick="showToast('User suspended')">Suspend</button></div><div class="table-row"><span>Carol White</span><span class="status s-pending">Pending</span><span>$950</span><button class="action-btn" onclick="showToast('User approved!')">Approve</button></div><div class="table-row"><span>Dan Lee</span><span class="status s-inactive">Inactive</span><span>$0</span><button class="action-btn" onclick="showToast('Activation email sent!')">Activate</button></div><div class="table-row"><span>Eve Chen</span><span class="status s-active">Active</span><span>$6,100</span><button class="action-btn" onclick="showToast('User suspended')">Suspend</button></div></div></div><div id="view-products" class="view"><div class="topbar"><h1>📦 Products</h1></div><div class="product-grid"><div class="product-card"><div class="product-emoji">👟</div><div class="product-name">Sneakers</div><div class="product-stock">124 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing sneakers...')">Edit</button></div><div class="product-card"><div class="product-emoji">🎧</div><div class="product-name">Headphones</div><div class="product-stock">89 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing headphones...')">Edit</button></div><div class="product-card"><div class="product-emoji">⌚</div><div class="product-name">Smart Watch</div><div class="product-stock">56 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing watch...')">Edit</button></div><div class="product-card"><div class="product-emoji">🎒</div><div class="product-name">Backpack</div><div class="product-stock">200 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing backpack...')">Edit</button></div><div class="product-card"><div class="product-emoji">📱</div><div class="product-name">Phone Case</div><div class="product-stock">340 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing case...')">Edit</button></div><div class="product-card"><div class="product-emoji">🕶️</div><div class="product-name">Sunglasses</div><div class="product-stock">78 in stock</div><button class="action-btn" style="margin-top:8px" onclick="showToast('Editing sunglasses...')">Edit</button></div></div></div><div id="view-billing" class="view"><div class="topbar"><h1>💳 Billing</h1></div><div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat-card"><div class="stat-label">Current Plan</div><div class="stat-value" style="font-size:18px">Pro Plan</div><div class="stat-up">$29/month</div></div><div class="stat-card"><div class="stat-label">Next Billing</div><div class="stat-value" style="font-size:18px">Jul 15</div><div class="stat-up">Auto-renew</div></div><div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-value" style="font-size:18px">$348</div><div class="stat-up">12 months</div></div></div><div class="table-card"><div class="chart-title">Payment History</div><div class="table-row table-header"><span>Date</span><span>Amount</span><span>Status</span><span>Action</span></div><div class="table-row"><span>Jun 15, 2026</span><span>$29.00</span><span class="status s-active">Paid</span><button class="action-btn" onclick="showToast('Invoice downloaded!')">Invoice</button></div><div class="table-row"><span>May 15, 2026</span><span>$29.00</span><span class="status s-active">Paid</span><button class="action-btn" onclick="showToast('Invoice downloaded!')">Invoice</button></div><div class="table-row"><span>Apr 15, 2026</span><span>$29.00</span><span class="status s-active">Paid</span><button class="action-btn" onclick="showToast('Invoice downloaded!')">Invoice</button></div></div></div><div id="view-settings" class="view"><div class="topbar"><h1>⚙️ Settings</h1></div><div class="settings-form"><div class="form-group"><label>Company Name</label><input class="form-input" value="Pulse Analytics Inc." /></div><div class="form-group"><label>Admin Email</label><input class="form-input" value="admin@pulse.app" /></div><div class="form-group"><label>Timezone</label><select class="form-input"><option>UTC-8 (Pacific)</option><option>UTC-5 (Eastern)</option><option selected>UTC+0 (London)</option><option>UTC+5:30 (Mumbai)</option></select></div><div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0">Dark Mode</label><div class="toggle on" onclick="this.classList.toggle('on');showToast('Theme toggled!')"><div class="toggle-dot"></div></div></div><div class="form-group" style="display:flex;align-items:center;gap:10px"><label style="margin:0">Email Notifications</label><div class="toggle on" onclick="this.classList.toggle('on');showToast('Notifications updated!')"><div class="toggle-dot"></div></div></div><button class="save-btn" onclick="showToast('Settings saved! ✓')">Save Changes</button></div></div></div><div class="toast" id="toast"></div><script>function showView(v){document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));document.getElementById('view-'+v).classList.add('active');document.querySelectorAll('.sidebar-item').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase().includes(v))e.classList.add('active')})}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "DevFolio",
    description: "Developer portfolio with projects, skills & testimonials",
    pattern: "portfolio",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DevFolio</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}.page{display:none}.page.active{display:block}nav{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:rgba(15,23,42,.95);border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:10}.nav-name{font-size:16px;font-weight:700;cursor:pointer}.nav-links{display:flex;gap:20px;font-size:13px;color:#94a3b8}.nav-links span{cursor:pointer;transition:color .2s;padding:4px 0;border-bottom:2px solid transparent}.nav-links span:hover{color:#10b981}.nav-links span.active{color:#e2e8f0;border-bottom-color:#10b981}.hire-btn{background:#10b981;color:#fff;border:none;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:transform .2s}.hire-btn:hover{transform:scale(1.05)}.hero{padding:48px 24px;text-align:center;background:linear-gradient(135deg,#064e3b,#0f172a)}.hero h1{font-size:36px;font-weight:800;margin-bottom:10px}.hero h1 span{background:linear-gradient(90deg,#10b981,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero p{color:#94a3b8;max-width:440px;margin:0 auto 20px;font-size:14px}.hero-btns{display:flex;gap:10px;justify-content:center}.hero-btns button{padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:transform .2s}.hero-btns button:hover{transform:scale(1.05)}.btn-p{background:#10b981;color:#fff}.btn-o{background:transparent;border:1px solid #334155!important;color:#e2e8f0}.section{padding:36px 24px;max-width:800px;margin:0 auto}.section-label{font-size:11px;color:#10b981;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;text-align:center}.section-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:20px}.projects{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.project{background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;cursor:pointer;transition:transform .2s,border-color .2s}.project:hover{transform:translateY(-4px);border-color:#10b981}.project-img{height:80px;display:flex;align-items:center;justify-content:center;font-size:32px;background:linear-gradient(135deg,#064e3b,#1e3a5f)}.project-info{padding:12px}.project-info h3{font-size:14px;font-weight:600;margin-bottom:4px}.project-info p{font-size:11px;color:#94a3b8}.project-links{padding:0 12px 12px;display:flex;gap:8px}.proj-link{font-size:10px;color:#10b981;background:rgba(16,185,129,.1);padding:3px 10px;border-radius:6px;border:none;cursor:pointer}.proj-link:hover{background:rgba(16,185,129,.2)}.skills{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.skill{background:#1e293b;border-radius:12px;padding:14px;text-align:center;border:1px solid #334155;cursor:pointer;transition:transform .2s}.skill:hover{transform:translateY(-2px)}.skill-icon{font-size:24px;margin-bottom:4px}.skill h3{font-size:12px;font-weight:600}.skill-bar{width:100%;height:4px;background:#334155;border-radius:2px;margin-top:6px;overflow:hidden}.skill-fill{height:100%;border-radius:2px;background:#10b981}.testimonials{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.testimonial{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155}.testimonial p{font-size:12px;color:#94a3b8;font-style:italic;margin-bottom:8px}.testimonial-author{font-size:12px;font-weight:600;color:#10b981}.contact-form{max-width:400px;margin:0 auto}.form-group{margin-bottom:12px}.form-group label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}.form-input{width:100%;background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:8px;font-size:13px}.form-input:focus{outline:none;border-color:#10b981}textarea.form-input{height:80px;resize:none}.submit-btn{width:100%;background:#10b981;color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}.modal-overlay.open{display:flex}.modal{background:#1e293b;border-radius:16px;padding:24px;width:90%;max-width:500px;border:1px solid #334155;max-height:80vh;overflow-y:auto}.modal h2{font-size:18px;margin-bottom:12px}.modal p{font-size:13px;color:#94a3b8;line-height:1.6}.modal-close{background:#334155;color:#e2e8f0;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;margin-top:12px}.exp-list{display:flex;flex-direction:column;gap:12px}.exp-item{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;border-left:3px solid #10b981}.exp-item h3{font-size:14px;font-weight:600}.exp-item .exp-company{font-size:12px;color:#10b981;margin-bottom:4px}.exp-item p{font-size:11px;color:#94a3b8}.toast{position:fixed;bottom:24px;right:24px;background:#10b981;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}footer{text-align:center;padding:20px;border-top:1px solid #1e293b;color:#475569;font-size:11px;margin-top:32px}</style></head><body><nav><span class="nav-name" onclick="showPage('home')">Alex.dev</span><div class="nav-links"><span class="active" onclick="showPage('home')">Home</span><span onclick="showPage('projects')">Projects</span><span onclick="showPage('skills')">Skills</span><span onclick="showPage('experience')">Experience</span><span onclick="showPage('contact')">Contact</span></div><button class="hire-btn" onclick="showPage('contact')">Hire Me</button></nav><div id="page-home" class="page active"><div class="hero"><h1>I'm <span>Alex Chen</span></h1><p>Full-stack developer building beautiful, performant apps</p><div class="hero-btns"><button class="btn-p" onclick="showPage('projects')">View Projects</button><button class="btn-o" onclick="showToast('CV downloaded! 📄')">Download CV</button></div></div><div class="section"><div class="section-label">About</div><div class="section-title">Who I Am</div><p style="text-align:center;color:#94a3b8;font-size:13px;max-width:600px;margin:0 auto">I'm a passionate full-stack developer with 5+ years of experience building scalable web applications. I specialize in React, Node.js, and cloud architecture.</p></div><div class="section"><div class="section-label">Testimonials</div><div class="section-title">What Clients Say</div><div class="testimonials"><div class="testimonial"><p>"Alex delivered our e-commerce platform ahead of schedule. Exceptional code quality."</p><div class="testimonial-author">— Sarah M., CEO at TechStart</div></div><div class="testimonial"><p>"The dashboard Alex built transformed our data analysis workflow."</p><div class="testimonial-author">— James R., CTO at DataCorp</div></div></div></div></div><div id="page-projects" class="page"><div class="section"><div class="section-label">Portfolio</div><div class="section-title">Featured Projects</div><div class="projects"><div class="project" onclick="openProject('ShopFlow','A full-featured e-commerce platform built with React, Node.js, and Stripe. Features include real-time inventory, cart management, and secure checkout.')"><div class="project-img">🛍️</div><div class="project-info"><h3>ShopFlow</h3><p>E-commerce platform with Stripe</p></div><div class="project-links"><span class="proj-link" onclick="event.stopPropagation();showToast('Opening live demo...')">Live Demo</span><span class="proj-link" onclick="event.stopPropagation();showToast('Opening GitHub...')">GitHub</span></div></div><div class="project" onclick="openProject('DataViz Pro','Interactive analytics dashboard with real-time data streaming, custom chart builder, and exportable reports.')"><div class="project-img">📊</div><div class="project-info"><h3>DataViz Pro</h3><p>Interactive analytics dashboard</p></div><div class="project-links"><span class="proj-link" onclick="event.stopPropagation();showToast('Opening live demo...')">Live Demo</span><span class="proj-link" onclick="event.stopPropagation();showToast('Opening GitHub...')">GitHub</span></div></div><div class="project" onclick="openProject('ChatNow','Real-time messaging app with end-to-end encryption, file sharing, and video calling.')"><div class="project-img">💬</div><div class="project-info"><h3>ChatNow</h3><p>Real-time encrypted messaging</p></div><div class="project-links"><span class="proj-link" onclick="event.stopPropagation();showToast('Opening live demo...')">Live Demo</span><span class="proj-link" onclick="event.stopPropagation();showToast('Opening GitHub...')">GitHub</span></div></div><div class="project" onclick="openProject('CloudDeploy','One-click deployment platform supporting Docker, Kubernetes, and serverless functions.')"><div class="project-img">☁️</div><div class="project-info"><h3>CloudDeploy</h3><p>One-click deployment platform</p></div><div class="project-links"><span class="proj-link" onclick="event.stopPropagation();showToast('Opening live demo...')">Live Demo</span><span class="proj-link" onclick="event.stopPropagation();showToast('Opening GitHub...')">GitHub</span></div></div></div></div></div><div id="page-skills" class="page"><div class="section"><div class="section-label">Expertise</div><div class="section-title">Skills & Tools</div><div class="skills"><div class="skill" onclick="showToast('5+ years with React')"><div class="skill-icon">⚛️</div><h3>React</h3><div class="skill-bar"><div class="skill-fill" style="width:95%"></div></div></div><div class="skill" onclick="showToast('4+ years with Node.js')"><div class="skill-icon">🟢</div><h3>Node.js</h3><div class="skill-bar"><div class="skill-fill" style="width:90%"></div></div></div><div class="skill" onclick="showToast('UI/UX design proficiency')"><div class="skill-icon">🎨</div><h3>Figma</h3><div class="skill-bar"><div class="skill-fill" style="width:80%"></div></div></div><div class="skill" onclick="showToast('Cloud architecture expert')"><div class="skill-icon">☁️</div><h3>AWS</h3><div class="skill-bar"><div class="skill-fill" style="width:85%"></div></div></div><div class="skill" onclick="showToast('Data science & scripting')"><div class="skill-icon">🐍</div><h3>Python</h3><div class="skill-bar"><div class="skill-fill" style="width:75%"></div></div></div><div class="skill" onclick="showToast('Containerization expert')"><div class="skill-icon">🐳</div><h3>Docker</h3><div class="skill-bar"><div class="skill-fill" style="width:88%"></div></div></div><div class="skill" onclick="showToast('Database design & optimization')"><div class="skill-icon">📊</div><h3>PostgreSQL</h3><div class="skill-bar"><div class="skill-fill" style="width:82%"></div></div></div><div class="skill" onclick="showToast('Strong type safety advocate')"><div class="skill-icon">🔷</div><h3>TypeScript</h3><div class="skill-bar"><div class="skill-fill" style="width:92%"></div></div></div></div></div></div><div id="page-experience" class="page"><div class="section"><div class="section-label">Career</div><div class="section-title">Work Experience</div><div class="exp-list"><div class="exp-item"><div class="exp-company">TechStart Inc. • 2024 – Present</div><h3>Senior Full-Stack Engineer</h3><p>Leading a team of 5 developers building a SaaS analytics platform. Architected microservices backend serving 50K+ users.</p></div><div class="exp-item"><div class="exp-company">DataCorp • 2022 – 2024</div><h3>Full-Stack Developer</h3><p>Built real-time dashboards and data pipelines. Reduced page load times by 60% through optimization.</p></div><div class="exp-item"><div class="exp-company">Freelance • 2020 – 2022</div><h3>Web Developer</h3><p>Delivered 20+ projects for clients across e-commerce, fintech, and healthcare sectors.</p></div></div></div></div><div id="page-contact" class="page"><div class="section"><div class="section-label">Get in Touch</div><div class="section-title">Contact Me</div><div class="contact-form"><div class="form-group"><label>Name</label><input class="form-input" placeholder="Your name" /></div><div class="form-group"><label>Email</label><input class="form-input" placeholder="your@email.com" /></div><div class="form-group"><label>Message</label><textarea class="form-input" placeholder="Tell me about your project..."></textarea></div><button class="submit-btn" onclick="showToast('Message sent! I\\'ll reply within 24h 📩')">Send Message</button></div></div></div><div class="modal-overlay" id="projectModal"><div class="modal"><h2 id="modalTitle"></h2><p id="modalDesc"></p><button class="modal-close" onclick="document.getElementById('projectModal').classList.remove('open')">Close</button></div></div><div class="toast" id="toast"></div><footer>© 2026 Alex Chen. Built with ❤️</footer><script>function showPage(p){document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-links span').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase()===p||(p==='home'&&e.textContent==='Home'))e.classList.add('active')});window.scrollTo(0,0)}function openProject(t,d){document.getElementById('modalTitle').textContent=t;document.getElementById('modalDesc').textContent=d;document.getElementById('projectModal').classList.add('open')}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "FoodieSpot",
    description: "Restaurant site with menu, reviews & reservations",
    pattern: "restaurant",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FoodieSpot</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}.page{display:none}.page.active{display:block}nav{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:#1e293b;border-bottom:1px solid #334155;position:sticky;top:0;z-index:10}.logo{font-size:20px;font-weight:700;background:linear-gradient(90deg,#f97316,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer}.nav-links{display:flex;gap:20px;font-size:13px;color:#94a3b8}.nav-links span{cursor:pointer;transition:color .2s}.nav-links span:hover,.nav-links span.active{color:#e2e8f0}.reserve-btn{background:linear-gradient(90deg,#f97316,#ef4444);color:#fff;border:none;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:transform .2s}.reserve-btn:hover{transform:scale(1.05)}.hero{padding:48px 24px;text-align:center;background:linear-gradient(135deg,#7c2d12,#0f172a)}.hero h1{font-size:36px;font-weight:800;margin-bottom:10px}.hero p{color:#94a3b8;margin-bottom:20px;font-size:14px}.section{padding:36px 24px;max-width:800px;margin:0 auto}.section-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:20px}.menu-tabs{display:flex;justify-content:center;gap:8px;margin-bottom:20px}.menu-tab{padding:6px 16px;border-radius:999px;font-size:12px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer;transition:all .2s}.menu-tab.active{background:#f97316;color:#fff;border-color:#f97316}.menu{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.menu-item{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;display:flex;justify-content:space-between;align-items:center;transition:border-color .2s;cursor:pointer}.menu-item:hover{border-color:#f97316}.menu-name{font-size:14px;font-weight:600}.menu-desc{font-size:11px;color:#94a3b8;margin-top:2px}.menu-price{font-size:16px;font-weight:700;color:#f97316}.order-btn{background:#f97316;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:11px;cursor:pointer;margin-top:6px}.reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.review{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center}.review-stars{color:#f59e0b;font-size:14px;margin-bottom:6px}.review p{font-size:12px;color:#94a3b8;font-style:italic}.review-name{font-size:12px;font-weight:600;margin-top:8px}.reservation-form{max-width:400px;margin:0 auto;background:#1e293b;border-radius:16px;padding:24px;border:1px solid #334155}.form-group{margin-bottom:14px}.form-group label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}.form-input{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:8px;font-size:13px}.form-input:focus{outline:none;border-color:#f97316}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.submit-btn{width:100%;background:linear-gradient(90deg,#f97316,#ef4444);color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}.modal-overlay.open{display:flex}.modal{background:#1e293b;border-radius:16px;padding:24px;width:90%;max-width:400px;border:1px solid #334155;text-align:center}.modal h2{font-size:18px;margin-bottom:8px}.modal p{color:#94a3b8;font-size:13px}.modal-close{background:#334155;color:#e2e8f0;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;margin-top:12px}.toast{position:fixed;bottom:24px;right:24px;background:#f97316;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}footer{text-align:center;padding:20px;border-top:1px solid #1e293b;color:#475569;font-size:11px;margin-top:32px}</style></head><body><nav><span class="logo" onclick="showPage('home')">🍕 FoodieSpot</span><div class="nav-links"><span class="active" onclick="showPage('home')">Home</span><span onclick="showPage('menu')">Menu</span><span onclick="showPage('reviews')">Reviews</span><span onclick="showPage('reserve')">Reserve</span></div><button class="reserve-btn" onclick="showPage('reserve')">Reserve Table</button></nav><div id="page-home" class="page active"><div class="hero"><h1>Authentic Italian Cuisine</h1><p>Fresh ingredients, bold flavors, unforgettable experience</p><button class="reserve-btn" style="padding:12px 32px;font-size:14px;border-radius:10px" onclick="showPage('menu')">View Menu →</button></div><div class="section"><div class="section-title">🍽️ Popular Dishes</div><div class="menu"><div class="menu-item"><div><div class="menu-name">Margherita Pizza</div><div class="menu-desc">Fresh mozzarella, basil, tomato</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$14</div></div><div class="menu-item"><div><div class="menu-name">Truffle Pasta</div><div class="menu-desc">Black truffle, parmesan cream</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$22</div></div></div></div></div><div id="page-menu" class="page"><div class="section"><div class="section-title">🍽️ Full Menu</div><div class="menu-tabs"><button class="menu-tab active" onclick="filterMenu(this,'all')">All</button><button class="menu-tab" onclick="filterMenu(this,'pizza')">Pizza</button><button class="menu-tab" onclick="filterMenu(this,'pasta')">Pasta</button><button class="menu-tab" onclick="filterMenu(this,'dessert')">Desserts</button></div><div class="menu" id="menuGrid"><div class="menu-item" data-cat="pizza"><div><div class="menu-name">Margherita Pizza</div><div class="menu-desc">Fresh mozzarella, basil, tomato</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$14</div></div><div class="menu-item" data-cat="pasta"><div><div class="menu-name">Truffle Pasta</div><div class="menu-desc">Black truffle, parmesan cream</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$22</div></div><div class="menu-item" data-cat="pizza"><div><div class="menu-name">Pepperoni Deluxe</div><div class="menu-desc">Double pepperoni, mozzarella</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$16</div></div><div class="menu-item" data-cat="pasta"><div><div class="menu-name">Grilled Salmon</div><div class="menu-desc">Lemon herb butter, veggies</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$28</div></div><div class="menu-item" data-cat="dessert"><div><div class="menu-name">Tiramisu</div><div class="menu-desc">Classic Italian dessert</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$10</div></div><div class="menu-item" data-cat="dessert"><div><div class="menu-name">Panna Cotta</div><div class="menu-desc">Vanilla bean with berry compote</div><button class="order-btn" onclick="showToast('Added to order!')">+ Order</button></div><div class="menu-price">$12</div></div></div></div></div><div id="page-reviews" class="page"><div class="section"><div class="section-title">⭐ Guest Reviews</div><div class="reviews"><div class="review"><div class="review-stars">★★★★★</div><p>"Best Italian food in the city!"</p><div class="review-name">Sarah M.</div></div><div class="review"><div class="review-stars">★★★★★</div><p>"Amazing ambiance and flavors"</p><div class="review-name">James R.</div></div><div class="review"><div class="review-stars">★★★★☆</div><p>"Great pasta, will come again"</p><div class="review-name">Lisa K.</div></div><div class="review"><div class="review-stars">★★★★★</div><p>"The truffle pasta is divine!"</p><div class="review-name">Mike D.</div></div><div class="review"><div class="review-stars">★★★★★</div><p>"Perfect date night restaurant"</p><div class="review-name">Anna P.</div></div><div class="review"><div class="review-stars">★★★★☆</div><p>"Authentic Italian experience"</p><div class="review-name">Tom W.</div></div></div></div></div><div id="page-reserve" class="page"><div class="section"><div class="section-title">📅 Reserve a Table</div><div class="reservation-form"><div class="form-group"><label>Full Name</label><input class="form-input" placeholder="Your name" /></div><div class="form-group"><label>Email</label><input class="form-input" placeholder="your@email.com" /></div><div class="form-row"><div class="form-group"><label>Date</label><input class="form-input" type="date" /></div><div class="form-group"><label>Time</label><select class="form-input"><option>6:00 PM</option><option>7:00 PM</option><option selected>8:00 PM</option><option>9:00 PM</option></select></div></div><div class="form-row"><div class="form-group"><label>Guests</label><select class="form-input"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5+</option></select></div><div class="form-group"><label>Occasion</label><select class="form-input"><option>None</option><option>Birthday</option><option>Anniversary</option><option>Business</option></select></div></div><div class="form-group"><label>Special Requests</label><textarea class="form-input" style="height:60px;resize:none" placeholder="Dietary requirements, seating preference..."></textarea></div><button class="submit-btn" onclick="confirmReservation()">Confirm Reservation</button></div></div></div><div class="modal-overlay" id="confirmModal"><div class="modal"><h2>🎉 Reservation Confirmed!</h2><p>We've sent a confirmation to your email. See you soon!</p><button class="modal-close" onclick="document.getElementById('confirmModal').classList.remove('open');showPage('home')">Done</button></div></div><div class="toast" id="toast"></div><footer>© 2026 FoodieSpot. All rights reserved.</footer><script>function showPage(p){document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-links span').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase()===p||(p==='home'&&e.textContent==='Home')||(p==='reserve'&&e.textContent==='Reserve'))e.classList.add('active')});window.scrollTo(0,0)}function filterMenu(btn,cat){document.querySelectorAll('.menu-tab').forEach(e=>e.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('#menuGrid .menu-item').forEach(e=>{e.style.display=(cat==='all'||e.dataset.cat===cat)?'flex':'none'})}function confirmReservation(){document.getElementById('confirmModal').classList.add('open')}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "TaskFlow",
    description: "Project management app with boards, tasks & team view",
    pattern: "kanban",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TaskFlow</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;height:100vh;overflow:hidden}.sidebar{width:200px;background:#1e293b;border-right:1px solid #334155;padding:16px;flex-shrink:0}.sidebar-logo{font-size:18px;font-weight:700;margin-bottom:20px;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sidebar-item{padding:8px 10px;border-radius:8px;font-size:13px;color:#94a3b8;margin-bottom:2px;cursor:pointer;transition:all .2s}.sidebar-item:hover{background:#334155;color:#e2e8f0}.sidebar-item.active{background:#a855f7;color:#fff}.main{flex:1;overflow-y:auto;padding:20px}.view{display:none}.view.active{display:block}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.topbar h1{font-size:20px;font-weight:700}.add-btn{background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:transform .2s}.add-btn:hover{transform:scale(1.05)}.board{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.column{background:#1e293b;border-radius:12px;padding:14px;border:1px solid #334155}.col-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;font-weight:600}.col-count{background:#334155;padding:2px 8px;border-radius:999px;font-size:11px}.task{background:#0f172a;border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid #334155;cursor:pointer;transition:border-color .2s}.task:hover{border-color:#a855f7}.task-title{font-size:13px;font-weight:600;margin-bottom:4px}.task-desc{font-size:11px;color:#94a3b8;margin-bottom:8px}.task-footer{display:flex;justify-content:space-between;align-items:center}.task-tag{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:500}.tag-high{background:rgba(239,68,68,.15);color:#ef4444}.tag-med{background:rgba(245,158,11,.15);color:#f59e0b}.tag-low{background:rgba(34,197,94,.15);color:#22c55e}.task-avatar{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;background:#a855f7}.move-btns{display:flex;gap:4px;margin-top:6px}.move-btn{background:#334155;color:#e2e8f0;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer}.move-btn:hover{background:#a855f7}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.cal-header{font-size:11px;color:#64748b;text-align:center;padding:4px}.cal-day{background:#1e293b;border-radius:8px;padding:8px;text-align:center;font-size:12px;border:1px solid #334155;cursor:pointer;transition:border-color .2s;min-height:40px}.cal-day:hover{border-color:#a855f7}.cal-day.has-task{border-color:#a855f7;background:#1e1b4b}.cal-today{border-color:#ec4899!important;font-weight:700}.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.team-card{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center}.team-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#a855f7,#ec4899);margin:0 auto 8px}.team-name{font-size:14px;font-weight:600}.team-role{font-size:11px;color:#94a3b8;margin-bottom:8px}.team-stat{font-size:11px;color:#a855f7}.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}.modal-overlay.open{display:flex}.modal{background:#1e293b;border-radius:16px;padding:24px;width:90%;max-width:400px;border:1px solid #334155}.modal h2{font-size:18px;margin-bottom:16px}.form-group{margin-bottom:12px}.form-group label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}.form-input{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 12px;border-radius:8px;font-size:13px}.form-input:focus{outline:none;border-color:#a855f7}.modal-actions{display:flex;gap:8px;margin-top:12px}.modal-close{background:#334155;color:#e2e8f0;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px}.save-btn{background:#a855f7;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600}.toast{position:fixed;bottom:24px;right:24px;background:#a855f7;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><div class="sidebar"><div class="sidebar-logo">✅ TaskFlow</div><div class="sidebar-item active" onclick="showView('board')">📋 Board</div><div class="sidebar-item" onclick="showView('calendar')">📅 Calendar</div><div class="sidebar-item" onclick="showView('team')">👥 Team</div><div class="sidebar-item" onclick="showView('reports')">📊 Reports</div><div class="sidebar-item" onclick="showView('settings')">⚙️ Settings</div></div><div class="main"><div id="view-board" class="view active"><div class="topbar"><h1>Sprint Board</h1><button class="add-btn" onclick="openNewTask()">+ New Task</button></div><div class="board"><div class="column" id="col-todo"><div class="col-header"><span>📋 To Do</span><span class="col-count">3</span></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Design landing page</div><div class="task-desc">Create mockups for new homepage</div><div class="task-footer"><span class="task-tag tag-high">High</span><div class="task-avatar">AS</div></div><div class="move-btns"><button class="move-btn" onclick="event.stopPropagation();showToast('Moved to In Progress →')">Move →</button></div></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">API integration</div><div class="task-desc">Connect payment gateway</div><div class="task-footer"><span class="task-tag tag-med">Medium</span><div class="task-avatar">BJ</div></div><div class="move-btns"><button class="move-btn" onclick="event.stopPropagation();showToast('Moved to In Progress →')">Move →</button></div></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Write docs</div><div class="task-desc">Update API documentation</div><div class="task-footer"><span class="task-tag tag-low">Low</span><div class="task-avatar">CW</div></div><div class="move-btns"><button class="move-btn" onclick="event.stopPropagation();showToast('Moved to In Progress →')">Move →</button></div></div></div><div class="column" id="col-progress"><div class="col-header"><span>🔄 In Progress</span><span class="col-count">2</span></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Auth system</div><div class="task-desc">Implement OAuth 2.0</div><div class="task-footer"><span class="task-tag tag-high">High</span><div class="task-avatar">AS</div></div><div class="move-btns"><button class="move-btn" onclick="event.stopPropagation();showToast('← Moved back')">← Back</button><button class="move-btn" onclick="event.stopPropagation();showToast('Moved to Done ✓')">Done ✓</button></div></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Mobile responsive</div><div class="task-desc">Fix tablet breakpoints</div><div class="task-footer"><span class="task-tag tag-med">Medium</span><div class="task-avatar">BJ</div></div><div class="move-btns"><button class="move-btn" onclick="event.stopPropagation();showToast('← Moved back')">← Back</button><button class="move-btn" onclick="event.stopPropagation();showToast('Moved to Done ✓')">Done ✓</button></div></div></div><div class="column" id="col-done"><div class="col-header"><span>✅ Done</span><span class="col-count">2</span></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Setup CI/CD</div><div class="task-desc">GitHub Actions pipeline</div><div class="task-footer"><span class="task-tag tag-low">Low</span><div class="task-avatar">CW</div></div></div><div class="task" onclick="showToast('Opening task details...')"><div class="task-title">Database schema</div><div class="task-desc">PostgreSQL tables setup</div><div class="task-footer"><span class="task-tag tag-med">Medium</span><div class="task-avatar">AS</div></div></div></div></div></div><div id="view-calendar" class="view"><div class="topbar"><h1>📅 Calendar - July 2026</h1></div><div class="calendar-grid"><div class="cal-header">Sun</div><div class="cal-header">Mon</div><div class="cal-header">Tue</div><div class="cal-header">Wed</div><div class="cal-header">Thu</div><div class="cal-header">Fri</div><div class="cal-header">Sat</div><div class="cal-day"></div><div class="cal-day"></div><div class="cal-day"></div><div class="cal-day">1</div><div class="cal-day has-task" onclick="showToast('Sprint Planning meeting')">2 📋</div><div class="cal-day">3</div><div class="cal-day">4</div><div class="cal-day cal-today">5</div><div class="cal-day">6</div><div class="cal-day has-task" onclick="showToast('Design review at 2pm')">7 🎨</div><div class="cal-day">8</div><div class="cal-day">9</div><div class="cal-day has-task" onclick="showToast('API deadline')">10 🔴</div><div class="cal-day">11</div><div class="cal-day">12</div><div class="cal-day">13</div><div class="cal-day">14</div><div class="cal-day has-task" onclick="showToast('Sprint retrospective')">15 🔄</div><div class="cal-day">16</div><div class="cal-day">17</div><div class="cal-day">18</div></div></div><div id="view-team" class="view"><div class="topbar"><h1>👥 Team Members</h1></div><div class="team-grid"><div class="team-card"><div class="team-avatar">AS</div><div class="team-name">Alice Smith</div><div class="team-role">Lead Developer</div><div class="team-stat">12 tasks completed</div></div><div class="team-card"><div class="team-avatar">BJ</div><div class="team-name">Bob Jones</div><div class="team-role">Frontend Dev</div><div class="team-stat">8 tasks completed</div></div><div class="team-card"><div class="team-avatar">CW</div><div class="team-name">Carol White</div><div class="team-role">Backend Dev</div><div class="team-stat">10 tasks completed</div></div></div></div><div id="view-reports" class="view"><div class="topbar"><h1>📊 Reports</h1></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Task Completion</div><div style="display:flex;align-items:flex-end;gap:6px;height:80px"><div style="flex:1;background:#a855f7;border-radius:3px 3px 0 0;height:60%"></div><div style="flex:1;background:#a855f7;border-radius:3px 3px 0 0;height:80%"></div><div style="flex:1;background:#a855f7;border-radius:3px 3px 0 0;height:45%"></div><div style="flex:1;background:#a855f7;border-radius:3px 3px 0 0;height:90%"></div><div style="flex:1;background:#ec4899;border-radius:3px 3px 0 0;height:100%"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:6px"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></div><div style="background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Sprint Velocity</div><div style="font-size:36px;font-weight:700;color:#a855f7;margin-bottom:4px">42</div><div style="font-size:12px;color:#22c55e">↑ 15% from last sprint</div><div style="font-size:11px;color:#94a3b8;margin-top:8px">7 stories completed • 3 bugs fixed</div></div></div></div><div id="view-settings" class="view"><div class="topbar"><h1>⚙️ Settings</h1></div><div style="max-width:400px"><div class="form-group"><label>Project Name</label><input class="form-input" value="TaskFlow Sprint 12" /></div><div class="form-group"><label>Sprint Duration</label><select class="form-input"><option>1 week</option><option selected>2 weeks</option><option>3 weeks</option></select></div><button class="save-btn" onclick="showToast('Settings saved! ✓')">Save Changes</button></div></div></div><div class="modal-overlay" id="newTaskModal"><div class="modal"><h2>✨ New Task</h2><div class="form-group"><label>Title</label><input class="form-input" placeholder="Task title" /></div><div class="form-group"><label>Description</label><textarea class="form-input" style="height:60px;resize:none" placeholder="Describe the task..."></textarea></div><div class="form-group"><label>Priority</label><select class="form-input"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select></div><div class="form-group"><label>Assignee</label><select class="form-input"><option>Alice Smith</option><option>Bob Jones</option><option>Carol White</option></select></div><div class="modal-actions"><button class="modal-close" onclick="document.getElementById('newTaskModal').classList.remove('open')">Cancel</button><button class="save-btn" onclick="document.getElementById('newTaskModal').classList.remove('open');showToast('Task created! ✓')">Create Task</button></div></div></div><div class="toast" id="toast"></div><script>function showView(v){document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));document.getElementById('view-'+v).classList.add('active');document.querySelectorAll('.sidebar-item').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase().includes(v))e.classList.add('active')})}function openNewTask(){document.getElementById('newTaskModal').classList.add('open')}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "FitTrack",
    description: "Fitness tracker with workouts, stats & progress charts",
    pattern: "fitness",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FitTrack</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}.page{display:none}.page.active{display:block}nav{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:#1e293b;border-bottom:1px solid #334155;position:sticky;top:0;z-index:10}.logo{font-size:20px;font-weight:700;background:linear-gradient(90deg,#22c55e,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer}.nav-links{display:flex;gap:20px;font-size:13px;color:#94a3b8}.nav-links span{cursor:pointer;transition:color .2s}.nav-links span:hover,.nav-links span.active{color:#e2e8f0}.section{padding:24px;max-width:900px;margin:0 auto}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.stat{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center;cursor:pointer;transition:border-color .2s}.stat:hover{border-color:#22c55e}.stat-icon{font-size:24px;margin-bottom:6px}.stat-value{font-size:22px;font-weight:700}.stat-label{font-size:11px;color:#64748b;margin-top:2px}.progress-card{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155;margin-bottom:16px}.card-title{font-size:14px;font-weight:600;margin-bottom:14px}.progress-bars{display:flex;flex-direction:column;gap:10px}.p-bar{display:flex;align-items:center;gap:10px;font-size:12px}.p-bar-label{width:60px;color:#94a3b8}.p-bar-track{flex:1;height:8px;background:#334155;border-radius:999px;overflow:hidden}.p-bar-fill{height:100%;border-radius:999px;transition:width 1s}.workouts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.workout{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center;cursor:pointer;transition:transform .2s}.workout:hover{transform:translateY(-4px)}.workout-icon{font-size:32px;margin-bottom:8px}.workout h3{font-size:14px;font-weight:600;margin-bottom:4px}.workout p{font-size:11px;color:#94a3b8}.workout-stat{margin-top:8px;font-size:18px;font-weight:700;color:#22c55e}.log-btn{background:#22c55e;color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;margin-top:8px}.workout-list{display:flex;flex-direction:column;gap:8px}.workout-row{background:#1e293b;border-radius:10px;padding:14px;border:1px solid #334155;display:flex;justify-content:space-between;align-items:center}.workout-info{display:flex;align-items:center;gap:12px}.workout-info .icon{font-size:24px}.workout-details h3{font-size:13px;font-weight:600}.workout-details p{font-size:11px;color:#94a3b8}.workout-meta{text-align:right}.workout-meta .cal{font-size:16px;font-weight:700;color:#22c55e}.workout-meta .time{font-size:11px;color:#94a3b8}.nutrition-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.nutrition-card{background:#1e293b;border-radius:12px;padding:16px;border:1px solid #334155}.nutrition-value{font-size:24px;font-weight:700;margin:6px 0 2px}.nutrition-unit{font-size:11px;color:#94a3b8}.macro-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:8px}.macro-bar div{height:100%}.profile-card{background:#1e293b;border-radius:16px;padding:24px;border:1px solid #334155;max-width:400px;margin:0 auto;text-align:center}.profile-avatar{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,#22c55e,#06b6d4);margin:0 auto 12px}.profile-name{font-size:18px;font-weight:700}.profile-email{font-size:12px;color:#94a3b8;margin-bottom:12px}.profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.profile-stat{text-align:center}.profile-stat-value{font-size:18px;font-weight:700;color:#22c55e}.profile-stat-label{font-size:10px;color:#94a3b8}.edit-btn{background:#334155;color:#e2e8f0;border:none;padding:8px 20px;border-radius:8px;font-size:12px;cursor:pointer}.toast{position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}footer{text-align:center;padding:20px;border-top:1px solid #1e293b;color:#475569;font-size:11px;margin-top:24px}</style></head><body><nav><span class="logo" onclick="showPage('dashboard')">💪 FitTrack</span><div class="nav-links"><span class="active" onclick="showPage('dashboard')">Dashboard</span><span onclick="showPage('workouts')">Workouts</span><span onclick="showPage('nutrition')">Nutrition</span><span onclick="showPage('profile')">Profile</span></div></nav><div id="page-dashboard" class="page active"><div class="section"><div class="stats"><div class="stat" onclick="showToast('Calories tracked today')"><div class="stat-icon">🔥</div><div class="stat-value">2,450</div><div class="stat-label">Calories</div></div><div class="stat" onclick="showToast('Steps tracked today')"><div class="stat-icon">👣</div><div class="stat-value">8,392</div><div class="stat-label">Steps</div></div><div class="stat" onclick="showToast('Active minutes today')"><div class="stat-icon">⏱️</div><div class="stat-value">47m</div><div class="stat-label">Active</div></div><div class="stat" onclick="showToast('Water intake today')"><div class="stat-icon">💧</div><div class="stat-value">2.1L</div><div class="stat-label">Water</div></div></div><div class="progress-card"><div class="card-title">Weekly Goals</div><div class="progress-bars"><div class="p-bar"><span class="p-bar-label">Cardio</span><div class="p-bar-track"><div class="p-bar-fill" style="width:78%;background:linear-gradient(90deg,#22c55e,#06b6d4)"></div></div><span>78%</span></div><div class="p-bar"><span class="p-bar-label">Strength</span><div class="p-bar-track"><div class="p-bar-fill" style="width:62%;background:linear-gradient(90deg,#a855f7,#ec4899)"></div></div><span>62%</span></div><div class="p-bar"><span class="p-bar-label">Flexibility</span><div class="p-bar-track"><div class="p-bar-fill" style="width:45%;background:linear-gradient(90deg,#f59e0b,#ef4444)"></div></div><span>45%</span></div></div></div><div class="card-title">Today's Workouts</div><div class="workouts"><div class="workout" onclick="showToast('View morning run details')"><div class="workout-icon">🏃</div><h3>Morning Run</h3><p>5.2 km • 28 min</p><div class="workout-stat">320 cal</div><button class="log-btn" onclick="event.stopPropagation();showToast('Workout logged! 🎉')">Log Again</button></div><div class="workout" onclick="showToast('View weight training details')"><div class="workout-icon">🏋️</div><h3>Weight Training</h3><p>Upper body • 45 min</p><div class="workout-stat">280 cal</div><button class="log-btn" onclick="event.stopPropagation();showToast('Workout logged! 🎉')">Log Again</button></div><div class="workout" onclick="showToast('View yoga details')"><div class="workout-icon">🧘</div><h3>Yoga</h3><p>Flexibility • 20 min</p><div class="workout-stat">95 cal</div><button class="log-btn" onclick="event.stopPropagation();showToast('Workout logged! 🎉')">Log Again</button></div></div></div></div><div id="page-workouts" class="page"><div class="section"><div class="card-title" style="font-size:20px;font-weight:700;margin-bottom:16px">🏋️ Workout History</div><div class="workout-list"><div class="workout-row"><div class="workout-info"><div class="icon">🏃</div><div class="workout-details"><h3>Morning Run</h3><p>Today, 7:00 AM • 5.2 km</p></div></div><div class="workout-meta"><div class="cal">320 cal</div><div class="time">28 min</div></div></div><div class="workout-row"><div class="workout-info"><div class="icon">🏋️</div><div class="workout-details"><h3>Weight Training</h3><p>Today, 10:00 AM • Upper body</p></div></div><div class="workout-meta"><div class="cal">280 cal</div><div class="time">45 min</div></div></div><div class="workout-row"><div class="workout-info"><div class="icon">🧘</div><div class="workout-details"><h3>Yoga Flow</h3><p>Today, 6:00 PM • Full body</p></div></div><div class="workout-meta"><div class="cal">95 cal</div><div class="time">20 min</div></div></div><div class="workout-row"><div class="workout-info"><div class="icon">🚴</div><div class="workout-details"><h3>Cycling</h3><p>Yesterday, 8:00 AM • 12 km</p></div></div><div class="workout-meta"><div class="cal">420 cal</div><div class="time">35 min</div></div></div><div class="workout-row"><div class="workout-info"><div class="icon">🏊</div><div class="workout-details"><h3>Swimming</h3><p>Yesterday, 5:00 PM • 30 laps</p></div></div><div class="workout-meta"><div class="cal">350 cal</div><div class="time">40 min</div></div></div></div></div></div><div id="page-nutrition" class="page"><div class="section"><div class="card-title" style="font-size:20px;font-weight:700;margin-bottom:16px">🥗 Nutrition Overview</div><div class="nutrition-grid"><div class="nutrition-card"><div class="card-title">Calories</div><div class="nutrition-value">2,450</div><div class="nutrition-unit">of 2,800 goal</div><div class="p-bar-track" style="margin-top:8px"><div class="p-bar-fill" style="width:87%;background:#22c55e"></div></div></div><div class="nutrition-card"><div class="card-title">Protein</div><div class="nutrition-value">128g</div><div class="nutrition-unit">of 150g goal</div><div class="p-bar-track" style="margin-top:8px"><div class="p-bar-fill" style="width:85%;background:#6366f1"></div></div></div><div class="nutrition-card"><div class="card-title">Carbs</div><div class="nutrition-value">280g</div><div class="nutrition-unit">of 350g goal</div><div class="p-bar-track" style="margin-top:8px"><div class="p-bar-fill" style="width:80%;background:#f59e0b"></div></div></div><div class="nutrition-card"><div class="card-title">Fat</div><div class="nutrition-value">65g</div><div class="nutrition-unit">of 80g goal</div><div class="p-bar-track" style="margin-top:8px"><div class="p-bar-fill" style="width:81%;background:#ef4444"></div></div></div></div><div class="progress-card" style="margin-top:16px"><div class="card-title">Macro Split</div><div class="macro-bar"><div style="width:35%;background:#6366f1" title="Protein 35%"></div><div style="width:45%;background:#f59e0b" title="Carbs 45%"></div><div style="width:20%;background:#ef4444" title="Fat 20%"></div></div><div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#94a3b8"><span>🟣 Protein 35%</span><span>🟡 Carbs 45%</span><span>🔴 Fat 20%</span></div></div></div></div><div id="page-profile" class="page"><div class="section"><div class="profile-card"><div class="profile-avatar">🏃</div><div class="profile-name">Alex Runner</div><div class="profile-email">alex@fittrack.app</div><div class="profile-stats"><div class="profile-stat"><div class="profile-stat-value">142</div><div class="profile-stat-label">Workouts</div></div><div class="profile-stat"><div class="profile-stat-value">48K</div><div class="profile-stat-label">Calories</div></div><div class="profile-stat"><div class="profile-stat-value">28</div><div class="profile-stat-label">Day Streak</div></div></div><button class="edit-btn" onclick="showToast('Edit profile coming soon!')">Edit Profile</button></div></div></div><div class="toast" id="toast"></div><footer>© 2026 FitTrack. Stay active.</footer><script>function showPage(p){document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-links span').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase()===p)e.classList.add('active')});window.scrollTo(0,0)}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "BuzzChat",
    description: "Real-time chat app with channels, DMs & reactions",
    pattern: "chat",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BuzzChat</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;height:100vh;overflow:hidden}.channels{width:200px;background:#1e293b;border-right:1px solid #334155;flex-shrink:0;display:flex;flex-direction:column}.channels-header{padding:14px;border-bottom:1px solid #334155;font-size:16px;font-weight:700;background:linear-gradient(90deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.channel-list{flex:1;overflow-y:auto;padding:8px}.channel{padding:8px 12px;border-radius:8px;font-size:13px;color:#94a3b8;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}.channel:hover{background:#334155;color:#e2e8f0}.channel.active{background:#3b82f6;color:#fff}.channel-badge{background:#ef4444;color:#fff;font-size:9px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-left:auto}.dm-section{padding:10px 12px;border-top:1px solid #334155}.dm-title{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}.dm-user{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;font-size:12px;color:#94a3b8;cursor:pointer;transition:all .2s}.dm-user:hover{background:#334155;color:#e2e8f0}.dm-user.active{background:#3b82f6;color:#fff}.dm-avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;background:#6366f1}.online{position:relative}.online::after{content:'';width:8px;height:8px;background:#22c55e;border:2px solid #1e293b;border-radius:50%;position:absolute;bottom:-1px;right:-1px}.chat-area{flex:1;display:flex;flex-direction:column}.chat-header{padding:12px 20px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center}.chat-header h2{font-size:15px;font-weight:600}.header-actions{display:flex;gap:8px}.header-btn{background:#334155;color:#e2e8f0;border:none;padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer}.header-btn:hover{background:#3b82f6}.messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}.msg{display:flex;gap:10px;max-width:80%}.msg.sent{margin-left:auto;flex-direction:row-reverse}.msg-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}.msg-body{display:flex;flex-direction:column;gap:2px}.msg-name{font-size:11px;font-weight:600;color:#94a3b8}.msg-text{background:#1e293b;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;border:1px solid #334155}.msg.sent .msg-text{background:#3b82f6;border-color:#3b82f6;color:#fff}.msg-time{font-size:10px;color:#475569}.msg-reactions{display:flex;gap:4px;margin-top:2px}.reaction{background:#334155;border-radius:999px;padding:2px 6px;font-size:11px;cursor:pointer;border:1px solid transparent;transition:all .2s}.reaction:hover{border-color:#3b82f6}.reaction.active{border-color:#3b82f6;background:#1e3a5f}.input-area{padding:12px 20px;border-top:1px solid #334155;display:flex;gap:8px;align-items:center}.msg-input{flex:1;background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:10px 14px;border-radius:10px;font-size:13px}.msg-input:focus{outline:none;border-color:#3b82f6}.send-btn{background:#3b82f6;color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:transform .2s}.send-btn:hover{transform:scale(1.05)}.emoji-btn{background:transparent;border:none;font-size:18px;cursor:pointer;transition:transform .2s}.emoji-btn:hover{transform:scale(1.2)}.toast{position:fixed;bottom:24px;right:24px;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><div class="channels"><div class="channels-header">💬 BuzzChat</div><div class="channel-list"><div class="channel active" onclick="switchChannel(this,'general')">📢 general</div><div class="channel" onclick="switchChannel(this,'design')">🎨 design<span class="channel-badge">3</span></div><div class="channel" onclick="switchChannel(this,'dev')">💻 dev</div><div class="channel" onclick="switchChannel(this,'random')">🎲 random<span class="channel-badge">7</span></div></div><div class="dm-section"><div class="dm-title">Direct Messages</div><div class="dm-user" onclick="openDM(this,'Sarah')"><div class="dm-avatar online" style="background:#ec4899">S</div>Sarah</div><div class="dm-user" onclick="openDM(this,'Mike')"><div class="dm-avatar online" style="background:#22c55e">M</div>Mike</div><div class="dm-user" onclick="openDM(this,'Luna')"><div class="dm-avatar" style="background:#f59e0b">L</div>Luna</div></div></div><div class="chat-area"><div class="chat-header"><h2 id="chatTitle">📢 general</h2><div class="header-actions"><button class="header-btn" onclick="showToast('🔍 Search coming soon')">Search</button><button class="header-btn" onclick="showToast('📌 Pinned messages')">Pins</button><button class="header-btn" onclick="showToast('👥 3 members online')">Members</button></div></div><div class="messages" id="messageArea"><div class="msg"><div class="msg-avatar" style="background:#ec4899">S</div><div class="msg-body"><div class="msg-name">Sarah</div><div class="msg-text">Hey everyone! Just pushed the new design 🎨</div><div class="msg-reactions"><span class="reaction" onclick="toggleReaction(this)">🔥 2</span><span class="reaction" onclick="toggleReaction(this)">👍 4</span></div><div class="msg-time">10:32 AM</div></div></div><div class="msg"><div class="msg-avatar" style="background:#22c55e">M</div><div class="msg-body"><div class="msg-name">Mike</div><div class="msg-text">Looks great! The color palette is perfect 👌</div><div class="msg-reactions"><span class="reaction active" onclick="toggleReaction(this)">❤️ 1</span></div><div class="msg-time">10:34 AM</div></div></div><div class="msg sent"><div class="msg-avatar" style="background:#3b82f6">Y</div><div class="msg-body"><div class="msg-text">Thanks team! Let's ship it today 🚀</div><div class="msg-time">10:35 AM</div></div></div><div class="msg"><div class="msg-avatar" style="background:#f59e0b">L</div><div class="msg-body"><div class="msg-name">Luna</div><div class="msg-text">I'll handle the responsive testing. Should be done by 3pm.</div><div class="msg-time">10:38 AM</div></div></div></div><div class="input-area"><button class="emoji-btn" onclick="addEmoji()">😊</button><input class="msg-input" id="msgInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMessage()" /><button class="send-btn" onclick="sendMessage()">Send</button></div></div><div class="toast" id="toast"></div><script>let msgCount=0;const emojis=['😊','🎉','🔥','👍','❤️','🚀','✨','💯'];function switchChannel(el,name){document.querySelectorAll('.channel,.dm-user').forEach(e=>e.classList.remove('active'));el.classList.add('active');document.getElementById('chatTitle').innerHTML={'general':'📢 general','design':'🎨 design','dev':'💻 dev','random':'🎲 random'}[name]||name;const badge=el.querySelector('.channel-badge');if(badge)badge.remove();showToast('Switched to #'+name)}function openDM(el,name){document.querySelectorAll('.channel,.dm-user').forEach(e=>e.classList.remove('active'));el.classList.add('active');document.getElementById('chatTitle').textContent='💬 '+name;showToast('Chat with '+name)}function sendMessage(){const input=document.getElementById('msgInput');const text=input.value.trim();if(!text)return;const area=document.getElementById('messageArea');const div=document.createElement('div');div.className='msg sent';div.innerHTML='<div class="msg-avatar" style="background:#3b82f6">Y</div><div class="msg-body"><div class="msg-text">'+text+'</div><div class="msg-time">Just now</div></div>';area.appendChild(div);input.value='';area.scrollTop=area.scrollHeight;msgCount++;if(msgCount%2===0){setTimeout(()=>{const reply=document.createElement('div');reply.className='msg';const names=['Sarah','Mike','Luna'];const colors=['#ec4899','#22c55e','#f59e0b'];const replies=['That sounds great! 🎉','On it! 💪','Love this approach ✨','Agreed, let\\'s do it 🚀'];const idx=Math.floor(Math.random()*3);reply.innerHTML='<div class="msg-avatar" style="background:'+colors[idx]+'">'+names[idx][0]+'</div><div class="msg-body"><div class="msg-name">'+names[idx]+'</div><div class="msg-text">'+replies[Math.floor(Math.random()*replies.length)]+'</div><div class="msg-time">Just now</div></div>';area.appendChild(reply);area.scrollTop=area.scrollHeight},1200)}}function toggleReaction(el){el.classList.toggle('active');const parts=el.textContent.trim().split(' ');const num=parseInt(parts[1])||0;el.textContent=parts[0]+' '+(el.classList.contains('active')?num+1:Math.max(0,num-1))}function addEmoji(){const input=document.getElementById('msgInput');input.value+=emojis[Math.floor(Math.random()*emojis.length)];input.focus()}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "Feedora",
    description: "Social feed with posts, likes, comments & stories",
    pattern: "social",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feedora</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}.page{display:none}.page.active{display:block}nav{display:flex;justify-content:space-between;align-items:center;padding:12px 24px;background:#1e293b;border-bottom:1px solid #334155;position:sticky;top:0;z-index:10}.logo{font-size:20px;font-weight:700;background:linear-gradient(90deg,#f43f5e,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer}.nav-links{display:flex;gap:20px;font-size:13px;color:#94a3b8}.nav-links span{cursor:pointer;transition:color .2s}.nav-links span:hover,.nav-links span.active{color:#e2e8f0}.nav-icons{display:flex;gap:12px;font-size:16px;cursor:pointer}.section{padding:20px;max-width:520px;margin:0 auto}.stories{display:flex;gap:12px;padding:16px 0;overflow-x:auto}.story{flex-shrink:0;text-align:center;cursor:pointer;transition:transform .2s}.story:hover{transform:scale(1.08)}.story-ring{width:52px;height:52px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#f43f5e,#ec4899,#f59e0b);display:flex;align-items:center;justify-content:center}.story-inner{width:100%;height:100%;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid #0f172a}.story-name{font-size:10px;color:#94a3b8;margin-top:4px}.story.add .story-ring{background:#334155}.post{background:#1e293b;border-radius:16px;margin-bottom:16px;border:1px solid #334155;overflow:hidden}.post-header{display:flex;align-items:center;gap:10px;padding:12px 14px}.post-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;flex-shrink:0}.post-user{font-size:13px;font-weight:600}.post-time{font-size:10px;color:#64748b}.post-menu{margin-left:auto;color:#64748b;cursor:pointer;font-size:16px}.post-image{width:100%;height:200px;display:flex;align-items:center;justify-content:center;font-size:64px;background:linear-gradient(135deg,#1e1b4b,#1e3a5f)}.post-actions{display:flex;gap:16px;padding:12px 14px;border-top:1px solid #334155}.action{display:flex;align-items:center;gap:4px;font-size:12px;color:#94a3b8;cursor:pointer;transition:color .2s;background:none;border:none}.action:hover{color:#f43f5e}.action.liked{color:#f43f5e}.post-caption{padding:0 14px 12px;font-size:13px;line-height:1.5}.post-caption strong{font-weight:600}.comments-section{padding:0 14px 12px}.comment{display:flex;gap:8px;margin-bottom:8px;font-size:12px}.comment-avatar{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex-shrink:0}.comment strong{font-weight:600}.add-comment{display:flex;gap:8px;padding:0 14px 12px;align-items:center}.comment-input{flex:1;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:999px;font-size:11px}.comment-input:focus{outline:none;border-color:#f43f5e}.comment-post{background:none;border:none;color:#f43f5e;font-size:12px;font-weight:600;cursor:pointer}.notif-list{display:flex;flex-direction:column;gap:8px}.notif{background:#1e293b;border-radius:12px;padding:12px 14px;border:1px solid #334155;display:flex;align-items:center;gap:10px;font-size:12px;cursor:pointer;transition:border-color .2s}.notif:hover{border-color:#f43f5e}.notif.unread{border-left:3px solid #f43f5e}.notif-avi{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}.notif-time{margin-left:auto;font-size:10px;color:#64748b}.profile-header{text-align:center;padding:24px}.profile-pic{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;background:linear-gradient(135deg,#f43f5e,#ec4899);margin:0 auto 10px}.profile-name{font-size:18px;font-weight:700}.profile-bio{font-size:12px;color:#94a3b8;margin-top:4px}.profile-stats{display:flex;justify-content:center;gap:24px;margin-top:12px}.profile-stat-val{font-size:18px;font-weight:700}.profile-stat-label{font-size:10px;color:#64748b}.edit-btn{background:#334155;color:#e2e8f0;border:none;padding:8px 24px;border-radius:8px;font-size:12px;cursor:pointer;margin-top:12px}.edit-btn:hover{background:#f43f5e}.profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:16px}.grid-item{aspect-ratio:1;background:linear-gradient(135deg,#1e1b4b,#1e3a5f);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transition:opacity .2s}.grid-item:hover{opacity:.7}.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);z-index:100;align-items:center;justify-content:center}.modal-overlay.open{display:flex}.modal{background:#1e293b;border-radius:16px;padding:20px;width:90%;max-width:380px;border:1px solid #334155;text-align:center}.modal h2{font-size:16px;margin-bottom:12px}.modal-close{background:#334155;color:#e2e8f0;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;margin-top:10px}.toast{position:fixed;bottom:24px;right:24px;background:#f43f5e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><nav><span class="logo" onclick="showPage('feed')">Feedora</span><div class="nav-links"><span class="active" onclick="showPage('feed')">Feed</span><span onclick="showPage('explore')">Explore</span><span onclick="showPage('notifs')">Alerts</span><span onclick="showPage('profile')">Profile</span></div><div class="nav-icons"><span onclick="openCreate()">➕</span></div></nav><div id="page-feed" class="page active"><div class="section"><div class="stories"><div class="story add" onclick="showToast('Create a story')"><div class="story-ring"><div class="story-inner">+</div></div><div class="story-name">You</div></div><div class="story" onclick="viewStory('Sarah')"><div class="story-ring"><div class="story-inner">🌸</div></div><div class="story-name">Sarah</div></div><div class="story" onclick="viewStory('Mike')"><div class="story-ring"><div class="story-inner">🎸</div></div><div class="story-name">Mike</div></div><div class="story" onclick="viewStory('Luna')"><div class="story-ring"><div class="story-inner">🌙</div></div><div class="story-name">Luna</div></div><div class="story" onclick="viewStory('Jay')"><div class="story-ring"><div class="story-inner">⚡</div></div><div class="story-name">Jay</div></div></div><div id="feedPosts"><div class="post"><div class="post-header"><div class="post-avatar" style="background:#ec4899">S</div><div><div class="post-user">Sarah</div><div class="post-time">2h ago</div></div><span class="post-menu" onclick="showToast('Post options')">···</span></div><div class="post-image">🏔️</div><div class="post-actions"><button class="action" onclick="toggleLike(this)">♡ <span>24</span></button><button class="action" onclick="this.closest('.post').querySelector('.comment-input').focus()">💬 <span>8</span></button><button class="action" onclick="showToast('Shared!')">↗ Share</button><button class="action" style="margin-left:auto" onclick="toggleSave(this)">🔖</button></div><div class="post-caption"><strong>Sarah</strong> Sunset hike with the crew 🏔️✨ #mountains #adventure</div><div class="comments-section"><div class="comment"><div class="comment-avatar" style="background:#22c55e">M</div><div><strong>Mike</strong> Incredible view! 🤩</div></div><div class="comment"><div class="comment-avatar" style="background:#f59e0b">L</div><div><strong>Luna</strong> Take me next time!</div></div></div><div class="add-comment"><input class="comment-input" placeholder="Add a comment..." onkeydown="if(event.key==='Enter')postComment(this)" /><button class="comment-post" onclick="postComment(this.previousElementSibling)">Post</button></div></div><div class="post"><div class="post-header"><div class="post-avatar" style="background:#3b82f6">J</div><div><div class="post-user">Jay</div><div class="post-time">5h ago</div></div><span class="post-menu" onclick="showToast('Post options')">···</span></div><div class="post-image">🎨</div><div class="post-actions"><button class="action" onclick="toggleLike(this)">♡ <span>56</span></button><button class="action" onclick="this.closest('.post').querySelector('.comment-input').focus()">💬 <span>12</span></button><button class="action" onclick="showToast('Shared!')">↗ Share</button><button class="action" style="margin-left:auto" onclick="toggleSave(this)">🔖</button></div><div class="post-caption"><strong>Jay</strong> New digital art piece — took 3 weeks 🎨 thoughts?</div><div class="add-comment"><input class="comment-input" placeholder="Add a comment..." onkeydown="if(event.key==='Enter')postComment(this)" /><button class="comment-post" onclick="postComment(this.previousElementSibling)">Post</button></div></div></div></div></div><div id="page-explore" class="page"><div class="section"><h2 style="font-size:18px;font-weight:700;margin-bottom:14px">🔍 Explore</h2><div class="profile-grid"><div class="grid-item" onclick="showToast('Opening post')">🌅</div><div class="grid-item" onclick="showToast('Opening post')">🎭</div><div class="grid-item" onclick="showToast('Opening post')">🌿</div><div class="grid-item" onclick="showToast('Opening post')">🎶</div><div class="grid-item" onclick="showToast('Opening post')">🏙️</div><div class="grid-item" onclick="showToast('Opening post')">🎪</div><div class="grid-item" onclick="showToast('Opening post')">🌊</div><div class="grid-item" onclick="showToast('Opening post')">🎯</div><div class="grid-item" onclick="showToast('Opening post')">🍜</div></div></div></div><div id="page-notifs" class="page"><div class="section"><h2 style="font-size:18px;font-weight:700;margin-bottom:14px">🔔 Notifications</h2><div class="notif-list"><div class="notif unread" onclick="showToast('Viewing interaction')"><div class="notif-avi" style="background:#ec4899">S</div><div><strong>Sarah</strong> liked your post</div><div class="notif-time">2m</div></div><div class="notif unread" onclick="showToast('Viewing interaction')"><div class="notif-avi" style="background:#22c55e">M</div><div><strong>Mike</strong> commented: "Amazing!"</div><div class="notif-time">15m</div></div><div class="notif" onclick="showToast('Viewing interaction')"><div class="notif-avi" style="background:#f59e0b">L</div><div><strong>Luna</strong> started following you</div><div class="notif-time">1h</div></div><div class="notif" onclick="showToast('Viewing interaction')"><div class="notif-avi" style="background:#3b82f6">J</div><div><strong>Jay</strong> shared your post</div><div class="notif-time">3h</div></div></div></div></div><div id="page-profile" class="page"><div class="section"><div class="profile-header"><div class="profile-pic">🧑‍💻</div><div class="profile-name">You</div><div class="profile-bio">Building cool stuff ✨</div><div class="profile-stats"><div><div class="profile-stat-val">42</div><div class="profile-stat-label">Posts</div></div><div><div class="profile-stat-val">1.2K</div><div class="profile-stat-label">Followers</div></div><div><div class="profile-stat-val">348</div><div class="profile-stat-label">Following</div></div></div><button class="edit-btn" onclick="showToast('Edit profile coming soon!')">Edit Profile</button></div><div class="profile-grid"><div class="grid-item" onclick="showToast('Opening post')">🌄</div><div class="grid-item" onclick="showToast('Opening post')">🎵</div><div class="grid-item" onclick="showToast('Opening post')">☕</div><div class="grid-item" onclick="showToast('Opening post')">🏖️</div><div class="grid-item" onclick="showToast('Opening post')">🎮</div><div class="grid-item" onclick="showToast('Opening post')">📸</div></div></div></div><div class="modal-overlay" id="createModal"><div class="modal"><h2>📝 New Post</h2><textarea style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:10px;border-radius:10px;font-size:13px;height:80px;resize:none" placeholder="What's on your mind?"></textarea><button style="width:100%;background:linear-gradient(90deg,#f43f5e,#ec4899);color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px" onclick="document.getElementById('createModal').classList.remove('open');showToast('Post published! 🎉')">Post</button><button class="modal-close" onclick="document.getElementById('createModal').classList.remove('open')">Cancel</button></div></div><div class="toast" id="toast"></div><script>function showPage(p){document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');document.querySelectorAll('.nav-links span').forEach(e=>{e.classList.remove('active');if(e.textContent.toLowerCase()===p||(p==='feed'&&e.textContent==='Feed')||(p==='notifs'&&e.textContent==='Alerts'))e.classList.add('active')});window.scrollTo(0,0)}function toggleLike(el){el.classList.toggle('liked');const span=el.querySelector('span');const n=parseInt(span.textContent);span.textContent=el.classList.contains('liked')?n+1:n-1;el.innerHTML=(el.classList.contains('liked')?'❤️':'♡')+' <span>'+span.textContent+'</span>'}function toggleSave(el){const saved=el.textContent.includes('✅');el.textContent=saved?'🔖':'✅';showToast(saved?'Removed from saved':'Saved!')}function postComment(input){const text=input.value.trim();if(!text)return;const section=input.closest('.post').querySelector('.comments-section')||input.closest('.add-comment');const div=document.createElement('div');div.className='comment';div.innerHTML='<div class="comment-avatar" style="background:#6366f1">Y</div><div><strong>You</strong> '+text+'</div>';if(input.closest('.post').querySelector('.comments-section')){input.closest('.post').querySelector('.comments-section').appendChild(div)}else{const cs=document.createElement('div');cs.className='comments-section';cs.appendChild(div);input.closest('.add-comment').before(cs)}input.value=''}function viewStory(name){showToast('Viewing '+name+'\\'s story 📸')}function openCreate(){document.getElementById('createModal').classList.add('open')}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
  {
    title: "NoteSpace",
    description: "Note-taking app with folders, markdown & search",
    pattern: "notes",
    framework: "html",
    previewHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NoteSpace</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;height:100vh;overflow:hidden}.sidebar{width:220px;background:#1e293b;border-right:1px solid #334155;flex-shrink:0;display:flex;flex-direction:column}.sidebar-header{padding:14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155}.sidebar-logo{font-size:16px;font-weight:700;background:linear-gradient(90deg,#f59e0b,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.new-btn{background:#f59e0b;color:#1e293b;border:none;width:28px;height:28px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;transition:transform .2s}.new-btn:hover{transform:scale(1.1)}.search-box{margin:8px 12px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px 10px;border-radius:8px;font-size:12px}.search-box:focus{outline:none;border-color:#f59e0b}.folder-section{padding:8px 12px}.folder-title{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}.folder-title button{background:none;border:none;color:#64748b;cursor:pointer;font-size:12px}.folder-title button:hover{color:#f59e0b}.folder{padding:6px 10px;border-radius:6px;font-size:12px;color:#94a3b8;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;margin-bottom:2px}.folder:hover{background:#334155;color:#e2e8f0}.folder.active{background:rgba(245,158,11,.15);color:#f59e0b}.note-list{flex:1;overflow-y:auto;padding:8px 12px;border-top:1px solid #334155}.note-item{padding:10px;border-radius:8px;margin-bottom:4px;cursor:pointer;transition:all .2s;border:1px solid transparent}.note-item:hover{background:#334155}.note-item.active{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3)}.note-item-title{font-size:13px;font-weight:600;margin-bottom:2px}.note-item-preview{font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.note-item-time{font-size:10px;color:#475569;margin-top:4px}.editor{flex:1;display:flex;flex-direction:column}.editor-header{padding:12px 20px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center}.editor-title{background:none;border:none;color:#e2e8f0;font-size:18px;font-weight:700;outline:none;flex:1}.editor-actions{display:flex;gap:6px}.editor-btn{background:#334155;color:#e2e8f0;border:none;padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer;transition:all .2s}.editor-btn:hover{background:#f59e0b;color:#1e293b}.toolbar{padding:8px 20px;border-bottom:1px solid #334155;display:flex;gap:4px}.tool-btn{background:none;border:1px solid #334155;color:#94a3b8;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;transition:all .2s}.tool-btn:hover{border-color:#f59e0b;color:#f59e0b}.tool-btn.active{background:rgba(245,158,11,.15);color:#f59e0b;border-color:#f59e0b}.editor-area{flex:1;padding:20px;overflow-y:auto}.editor-content{width:100%;height:100%;background:none;border:none;color:#e2e8f0;font-size:14px;line-height:1.8;resize:none;outline:none;font-family:system-ui,sans-serif}.editor-content::placeholder{color:#475569}.word-count{padding:6px 20px;border-top:1px solid #334155;font-size:10px;color:#475569;display:flex;gap:16px}.toast{position:fixed;bottom:24px;right:24px;background:#f59e0b;color:#1e293b;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;transform:translateY(80px);opacity:0;transition:all .3s}.toast.show{transform:translateY(0);opacity:1}</style></head><body><div class="sidebar"><div class="sidebar-header"><span class="sidebar-logo">📝 NoteSpace</span><button class="new-btn" onclick="newNote()">+</button></div><input class="search-box" placeholder="Search notes..." oninput="searchNotes(this.value)" /><div class="folder-section"><div class="folder-title"><span>FOLDERS</span><button onclick="showToast('New folder created!')">+</button></div><div class="folder active" onclick="selectFolder(this,'all')">📁 All Notes</div><div class="folder" onclick="selectFolder(this,'personal')">💜 Personal</div><div class="folder" onclick="selectFolder(this,'work')">💼 Work</div><div class="folder" onclick="selectFolder(this,'ideas')">💡 Ideas</div><div class="folder" onclick="selectFolder(this,'archive')">📦 Archive</div></div><div class="note-list" id="noteList"><div class="note-item active" onclick="selectNote(this,0)"><div class="note-item-title">Project Roadmap</div><div class="note-item-preview">Q3 goals and milestones for the team...</div><div class="note-item-time">Today, 10:30 AM</div></div><div class="note-item" onclick="selectNote(this,1)"><div class="note-item-title">Meeting Notes</div><div class="note-item-preview">Discussed the new feature rollout...</div><div class="note-item-time">Yesterday</div></div><div class="note-item" onclick="selectNote(this,2)"><div class="note-item-title">Design Ideas</div><div class="note-item-preview">Dark mode palette exploration...</div><div class="note-item-time">Jul 5</div></div><div class="note-item" onclick="selectNote(this,3)"><div class="note-item-title">Reading List</div><div class="note-item-preview">Books and articles to read this month...</div><div class="note-item-time">Jul 3</div></div></div></div><div class="editor"><div class="editor-header"><input class="editor-title" id="noteTitle" value="Project Roadmap" /><div class="editor-actions"><button class="editor-btn" onclick="showToast('Note pinned! 📌')">📌 Pin</button><button class="editor-btn" onclick="showToast('Exported as markdown!')">↗ Export</button><button class="editor-btn" onclick="showToast('Note deleted')">🗑️</button></div></div><div class="toolbar"><button class="tool-btn" onclick="formatText('bold')"><strong>B</strong></button><button class="tool-btn" onclick="formatText('italic')"><em>I</em></button><button class="tool-btn" onclick="formatText('underline')"><u>U</u></button><button class="tool-btn" onclick="formatText('strike')"><s>S</s></button><button class="tool-btn" onclick="formatText('heading')">H1</button><button class="tool-btn" onclick="formatText('list')">• List</button><button class="tool-btn" onclick="formatText('code')">&lt;&gt;</button><button class="tool-btn" onclick="formatText('check')">☑</button></div><div class="editor-area"><textarea class="editor-content" id="noteContent" placeholder="Start writing..." oninput="updateWordCount()">## Project Roadmap — Q3 2026\n\n### Goals\n- Launch v2.0 of the platform\n- Onboard 500 new users\n- Implement real-time collaboration\n\n### Milestones\n1. **July 15** — Design finalized\n2. **Aug 1** — Beta release\n3. **Sep 1** — Public launch\n\n### Notes\nDiscuss with the team about the timeline. Need to allocate more resources for the backend migration.\n\n> "The best way to predict the future is to create it." — Peter Drucker</textarea></div><div class="word-count"><span id="wordCount">Words: 48</span><span id="charCount">Chars: 320</span><span>Markdown</span></div></div><div class="toast" id="toast"></div><script>const notes=[{title:'Project Roadmap',content:'## Project Roadmap — Q3 2026\\n\\n### Goals\\n- Launch v2.0 of the platform\\n- Onboard 500 new users\\n- Implement real-time collaboration\\n\\n### Milestones\\n1. **July 15** — Design finalized\\n2. **Aug 1** — Beta release\\n3. **Sep 1** — Public launch\\n\\n### Notes\\nDiscuss with the team about the timeline. Need to allocate more resources for the backend migration.\\n\\n> "The best way to predict the future is to create it." — Peter Drucker'},{title:'Meeting Notes',content:'## Weekly Standup — Jul 8\\n\\n### Attendees\\nSarah, Mike, Luna, Jay\\n\\n### Discussion\\n- Feature rollout on schedule\\n- Design review needed for mobile\\n- Backend migration 60% complete\\n\\n### Action Items\\n- [ ] Sarah: Finalize mockups\\n- [ ] Mike: API documentation\\n- [x] Luna: Testing framework setup'},{title:'Design Ideas',content:'## Dark Mode Palette\\n\\n### Colors\\n- Background: #0f172a\\n- Surface: #1e293b\\n- Accent: #f59e0b\\n\\n### Typography\\n- Headings: Inter Bold\\n- Body: Inter Regular\\n\\n### Inspiration\\nMinimal, clean, focused on content.'},{title:'Reading List',content:'## July Reading List\\n\\n### Books\\n1. Designing Data-Intensive Applications\\n2. The Pragmatic Programmer\\n3. Atomic Habits\\n\\n### Articles\\n- \"Why We Sleep\" summary\\n- React Server Components deep dive\\n- State of CSS 2026'}];let currentNote=0;function selectNote(el,idx){document.querySelectorAll('.note-item').forEach(e=>e.classList.remove('active'));el.classList.add('active');currentNote=idx;document.getElementById('noteTitle').value=notes[idx].title;document.getElementById('noteContent').value=notes[idx].content;updateWordCount()}function newNote(){notes.unshift({title:'Untitled',content:''});renderNoteList();selectNote(document.querySelector('.note-item'),0);showToast('New note created! ✨')}function renderNoteList(){const list=document.getElementById('noteList');list.innerHTML=notes.map((n,i)=>'<div class="note-item'+(i===currentNote?' active':'')+'" onclick="selectNote(this,'+i+')"><div class="note-item-title">'+n.title+'</div><div class="note-item-preview">'+n.content.substring(0,50)+'...</div><div class="note-item-time">Just now</div></div>').join('')}function searchNotes(q){const items=document.querySelectorAll('.note-item');items.forEach((el,i)=>{const match=notes[i].title.toLowerCase().includes(q.toLowerCase())||notes[i].content.toLowerCase().includes(q.toLowerCase());el.style.display=match?'block':'none'})}function selectFolder(el,name){document.querySelectorAll('.folder').forEach(e=>e.classList.remove('active'));el.classList.add('active');showToast('Viewing '+name+' notes')}function formatText(type){const ta=document.getElementById('noteContent');const start=ta.selectionStart;const end=ta.selectionEnd;const text=ta.value;const selected=text.substring(start,end)||'text';const formats={bold:'**'+selected+'**',italic:'_'+selected+'_',underline:'<u>'+selected+'</u>',strike:'~~'+selected+'~~',heading:'## '+selected,list:'- '+selected,code:'['+selected+']',check:'- [ ] '+selected};ta.value=text.substring(0,start)+formats[type]+text.substring(end);ta.focus();updateWordCount();showToast('Formatted: '+type)}function updateWordCount(){const text=document.getElementById('noteContent').value;const words=text.trim()?text.trim().split(/\\s+/).length:0;document.getElementById('wordCount').textContent='Words: '+words;document.getElementById('charCount').textContent='Chars: '+text.length;notes[currentNote].content=text;notes[currentNote].title=document.getElementById('noteTitle').value}function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}</script></body></html>`,
  },
];

/* ── BuildLanding ── */
function BuildLanding({
  onSend,
  isLoading,
  onPreviewExample,
}: {
  onSend: (msg: string, files: File[]) => void;
  isLoading: boolean;
  onPreviewExample: (app: typeof EXAMPLE_APPS[number]) => void;
}) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSend(input.trim(), attachments);
    setInput("");
    setAttachments([]);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments((p) => [...p, ...Array.from(e.target.files!)]);
  };

  return (
    <div className="flex-1 pt-20 pb-16">
      <div className="container px-4 max-w-2xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <Rocket className="w-3.5 h-3.5" />
            AI App Builder
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Describe it.{" "}
            <span className="gradient-text">We build it.</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">
            From thought to full-stack app — no setup, no code, just ship.
          </p>

          <form onSubmit={handleSubmit} className="text-left">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((file, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
                    {file.name}
                    <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative group">
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-end gap-2 glass rounded-xl p-2 bg-card">
                <input ref={fileRef} type="file" className="hidden" multiple accept="image/*,.txt,.md,.json,.html,.css,.js,.ts,.tsx,.jsx" onChange={handleFiles} />
                <Button type="button" variant="ghost" size="icon" aria-label="Attach files" className="h-9 w-9 shrink-0 mb-0.5" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="w-4 h-4" />
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                  placeholder="Describe the app you want to build..."
                  className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none overflow-hidden"
                  rows={2}
                  disabled={isLoading}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                />
                <Button type="submit" size="icon" aria-label="Send prompt" className="h-9 w-9 shrink-0 mb-0.5 bg-gradient-to-r from-primary to-accent text-primary-foreground" disabled={isLoading || (!input.trim() && attachments.length === 0)}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Prompt Chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => setInput(chip.prompt)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/50 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Example Apps */}
          <div className="mt-14 text-left">
            <h2 className="text-lg font-semibold mb-1 text-center">Explore what you can build</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Click to preview live</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {EXAMPLE_APPS.map((app) => (
                <button
                  key={app.title}
                  onClick={() => onPreviewExample(app)}
                  className="group text-left rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                >
                  <div className="h-28 relative overflow-hidden border-b border-border/20 bg-muted/10">
                    <div className="absolute inset-0 origin-top-left" style={{ width: "400%", height: "400%", transform: "scale(0.25)", pointerEvents: "none" }}>
                      <iframe
                        srcDoc={app.previewHtml.replace('</head>', '<style>*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}</style></head>')}
                        title={app.title}
                        className="w-full h-full border-0"
                        sandbox=""
                        tabIndex={-1}
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{app.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{app.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── BuildLoading ── */
const LOADING_STEPS = [
  { icon: Brain, label: "Understanding your requirements", duration: 3000 },
  { icon: Sparkles, label: "Designing the architecture", duration: 4000 },
  { icon: Code2, label: "Generating code files", duration: 8000 },
  { icon: FileCode, label: "Assembling the project", duration: 5000 },
];

function BuildLoading() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    LOADING_STEPS.forEach((_, i) => {
      if (i === 0) return;
      elapsed += LOADING_STEPS[i - 1].duration;
      timers.push(setTimeout(() => setCurrentStep(i), elapsed));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <h2 className="text-xl font-semibold mb-2">Building your app</h2>
        <p className="text-sm text-muted-foreground">This may take a minute...</p>
      </motion.div>
      <div className="w-full max-w-sm space-y-3">
        {LOADING_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${isActive ? "bg-primary/10 border border-primary/20" : isDone ? "bg-muted/50 opacity-70" : "opacity-40"}`}>
              <div className={`shrink-0 ${isActive ? "text-primary" : isDone ? "text-green-500" : "text-muted-foreground"}`}>
                {isDone ? <Check className="w-5 h-5" /> : <Icon className={`w-5 h-5 ${isActive ? "animate-pulse" : ""}`} />}
              </div>
              <span className={`text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ChatPanel ── */
function ChatPanel({ messages, isLoading, onSend }: { messages: ChatMessage[]; isLoading: boolean; onSend: (msg: string, files: File[]) => void }) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSend(input.trim(), attachments);
    setInput("");
    setAttachments([]);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-3 py-2 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 theme-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] min-w-0 rounded-xl px-3 sm:px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.attachments.map((a, j) => (
                    <span key={j} className="text-xs opacity-70 bg-background/20 rounded px-1.5 py-0.5">📎 {a.name}</span>
                  ))}
                </div>
              )}
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-sm [&_p]:mb-1.5 [&_ul]:text-sm [&_code]:text-xs [&_code]:bg-background/20 [&_code]:px-1 [&_code]:rounded [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:text-xs [&_img]:max-w-full [&_table]:block [&_table]:overflow-x-auto break-words overflow-hidden">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-2.5"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((file, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
                {file.name}
                <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" multiple accept="image/*,.txt,.md,.json,.html,.css,.js,.ts,.tsx,.jsx" onChange={(e) => { if (e.target.files) setAttachments((p) => [...p, ...Array.from(e.target.files!)]); }} />
          <Button type="button" variant="ghost" size="icon" aria-label="Attach files" className="h-8 w-8 shrink-0" onClick={() => fileRef.current?.click()}><Paperclip className="w-4 h-4" /></Button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask to modify, add features, fix bugs..." className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none border border-border/50 focus:border-primary/50 transition-colors" disabled={isLoading} />
          <Button type="submit" size="icon" aria-label="Send message" className="h-8 w-8 shrink-0" disabled={isLoading || (!input.trim() && attachments.length === 0)}><Send className="w-4 h-4" /></Button>
        </div>
      </form>
    </div>
  );
}

/* ── FileExplorer ── */
function FileExplorer({ files, selectedPath, onSelect }: { files: { path: string; content: string }[]; selectedPath: string; onSelect: (p: string) => void }) {
  const tree: Record<string, string[]> = {};
  files.forEach((f) => {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push(f.path);
  });

  return (
    <div className="overflow-y-auto h-full p-1 text-sm theme-scrollbar">
      {Object.entries(tree).map(([dir, paths]) => (
        <div key={dir} className="mb-1">
          {dir !== "." && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground font-medium">
              <FolderOpen className="w-3.5 h-3.5" />{dir}
            </div>
          )}
          {paths.map((p) => (
            <button key={p} onClick={() => onSelect(p)}
              className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${selectedPath === p ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
              <FileCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{p.split("/").pop()}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── CodeViewer ── */
function CodeViewer({ files, selectedPath }: { files: { path: string; content: string }[]; selectedPath: string }) {
  const file = files.find((f) => f.path === selectedPath);
  if (!file) return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Select a file to view its contents</div>;
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border/50 text-xs text-muted-foreground font-mono">{file.path}</div>
      <div className="flex-1 overflow-auto theme-scrollbar">
        <pre className="p-4 text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-words"><code>{file.content}</code></pre>
      </div>
    </div>
  );
}

/* ── BuildPreview ── */
function BuildPreview({ files, framework, viewport }: { files: { path: string; content: string }[]; framework: Framework; viewport: Viewport }) {
  if (files.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No files generated yet</div>;
  }

  let previewHtml = "";

  const staticPreviewFile = files.find((f) => f.path === "preview/index.html");
  const staticPreviewCss = files.find((f) => f.path === "preview/styles.css");

  if (staticPreviewFile) {
    previewHtml = staticPreviewFile.content;
    if (staticPreviewCss && !previewHtml.includes("preview/styles.css")) {
      previewHtml = previewHtml.includes("</head>")
        ? previewHtml.replace("</head>", `<style>${staticPreviewCss.content}</style></head>`)
        : `<style>${staticPreviewCss.content}</style>${previewHtml}`;
    }
  } else if (framework === "html") {
    const indexFile = files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
    const cssFile = files.find((f) => f.path.endsWith(".css"));
    const jsFile = files.find((f) => f.path.endsWith(".js"));

    if (indexFile) {
      previewHtml = indexFile.content;
      if (cssFile && !previewHtml.includes(cssFile.path)) {
        previewHtml = previewHtml.includes("</head>")
          ? previewHtml.replace("</head>", `<style>${cssFile.content}</style></head>`)
          : `<style>${cssFile.content}</style>${previewHtml}`;
      }
      if (jsFile && !previewHtml.includes(jsFile.path)) {
        previewHtml = previewHtml.includes("</body>")
          ? previewHtml.replace("</body>", `<script>${jsFile.content}</script></body>`)
          : `${previewHtml}<script>${jsFile.content}</script>`;
      }
    }
  }

  if (!previewHtml) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-6">
        Preview not available for this framework. Switch to Code tab to see generated files.
      </div>
    );
  }

  return (
    <div className="h-full flex items-start justify-center p-4 overflow-auto bg-muted/10">
      <iframe
        srcDoc={previewHtml}
        title="App Preview"
        className="bg-background rounded-lg shadow-lg border transition-all duration-300"
        style={{ width: viewportWidths[viewport], height: "100%", maxWidth: "100%" }}
        sandbox="allow-scripts"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main AppBuilder
   ═══════════════════════════════════════════ */

export default function AppBuilder() {
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setPageMeta({
      title: "Pix Engineer — AI App Builder & Design to Code",
      description: "Build full-stack apps from prompts, convert designs to code, and craft AI prompts — all in one platform.",
      path: "/",
    });
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [framework, setFramework] = useState<Framework>("nextjs");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [rightTab, setRightTab] = useState<"preview" | "code">("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [examplePreview, setExamplePreview] = useState<typeof EXAMPLE_APPS[number] | null>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "preview" | "code">("chat");
  const isMobile = useIsMobile();

  const displayFiles = files.filter((f) => !f.path.startsWith("preview/"));

  /* ── History queries ── */
  const { data: builds = [], isLoading: buildsLoading } = useQuery({
    queryKey: ["app-builds", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("app_builds")
        .select("id, title, framework, updated_at, files, messages")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteBuildMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_builds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-builds"] });
      toast({ title: "Build deleted" });
    },
  });

  const historyItems: HistoryItem[] = builds.map((b: any) => ({
    id: b.id,
    title: b.title || "Untitled App",
    subtitle: b.framework,
    updatedAt: b.updated_at,
  }));

  const loadBuild = (id: string) => {
    const build = builds.find((b: any) => b.id === id);
    if (!build) return;
    setActiveBuildId(build.id);
    setMessages((build.messages as any) || []);
    setFiles((build.files as any) || []);
    setFramework((build.framework as Framework) || "nextjs");
    setHasStarted(true);
    if ((build.files as any)?.length > 0) {
      setSelectedPath((build.files as any)[0].path);
    }
  };

  const newBuild = () => {
    setActiveBuildId(null);
    setMessages([]);
    setFiles([]);
    setSelectedPath("");
    setFramework("nextjs");
    setHasStarted(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const downloadZip = async () => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    displayFiles.forEach((file) => zip.file(file.path, file.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${framework}-project.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Auto-save build ── */
  const saveBuild = useCallback(async (msgs: ChatMessage[], builtFiles: { path: string; content: string }[], fw: Framework, buildId: string | null) => {
    if (!user || msgs.length === 0) return;
    const title = msgs[0]?.content?.substring(0, 80) || "Untitled App";
    try {
      if (buildId) {
        await supabase.from("app_builds").update({
          messages: msgs as any,
          files: builtFiles as any,
          framework: fw,
          title,
          updated_at: new Date().toISOString(),
        }).eq("id", buildId);
      } else {
        const { data } = await supabase.from("app_builds").insert({
          user_id: user.id,
          messages: msgs as any,
          files: builtFiles as any,
          framework: fw,
          title,
          prompt: msgs[0]?.content || "",
        }).select("id").single();
        if (data) setActiveBuildId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["app-builds"] });
    } catch { /* silent */ }
  }, [user, queryClient]);

  const handleSend = useCallback(
    async (message: string, attachments: File[]) => {
      if (!user) { navigate("/login"); return; }

      const detectedFw = !hasStarted ? detectFramework(message) : framework;
      if (!hasStarted) setFramework(detectedFw);
      setHasStarted(true);

      let userContent: any = message;
      if (attachments.length > 0) {
        const parts: any[] = [];
        if (message) parts.push({ type: "text", text: message });
        for (const file of attachments) {
          if (file.type.startsWith("image/")) {
            const base64 = await fileToBase64(file);
            parts.push({ type: "image_url", image_url: { url: base64 } });
          } else {
            const text = await file.text();
            parts.push({ type: "text", text: `File: ${file.name}\n\`\`\`\n${text}\n\`\`\`` });
          }
        }
        userContent = parts;
      }

      const userMsg: ChatMessage = { role: "user", content: message, attachments: attachments.map((f) => ({ name: f.name, type: f.type })) };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);

      try {
        const apiMessages = newMessages.map((m, i) => {
          if (i === newMessages.length - 1) return { role: "user", content: userContent };
          return { role: m.role, content: m.content };
        });

        const { data, error } = await supabase.functions.invoke("build-app", {
          body: { messages: apiMessages, framework: detectedFw, existingFiles: files },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data.usedFreeModel) {
          toast({ title: "Free model used", description: "Results may vary. Buy credits for premium models." });
        }

        const newFiles = data.files && data.files.length > 0 ? data.files : files;
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
          setSelectedPath(data.files[0].path);
          setRightTab("preview");
        }

        const assistantMsg: ChatMessage = { role: "assistant", content: data.assistantMessage || "Project generated!" };
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);
        refetchProfile();

        // Auto-save
        saveBuild(finalMessages, newFiles, detectedFw, activeBuildId);
      } catch (err: any) {
        toast({ title: "Build failed", description: err.message || "Something went wrong.", variant: "destructive" });
        setMessages(messages);
        if (messages.length === 0) setHasStarted(false);
      } finally {
        setIsLoading(false);
      }
    },
    [user, profile, messages, files, framework, hasStarted, navigate, toast, refetchProfile, activeBuildId, saveBuild]
  );

  /* ── Example App Fullscreen Preview ── */
  if (examplePreview) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium">{examplePreview.title} — Example Preview</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExamplePreview(null)}>
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1">
          <iframe
            srcDoc={examplePreview.previewHtml}
            title={examplePreview.title}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    );
  }

  /* ── Landing state ── */
  if (!hasStarted) {
    return (
      <div className="h-[calc(100vh-56px)] mt-14 flex">
        <FeatureHistorySidebar
          items={historyItems}
          isLoading={buildsLoading}
          onSelect={loadBuild}
          onDelete={(id) => deleteBuildMutation.mutate(id)}
          onNewItem={newBuild}
          label="Projects"
          newLabel="New Project"
        />
        <div className="flex-1 flex flex-col min-w-0">
          <BuildLanding onSend={handleSend} isLoading={isLoading} onPreviewExample={setExamplePreview} />
          <Footer />
        </div>
      </div>
    );
  }

  if (isLoading && files.length === 0) {
    return (
      <div className="h-[calc(100vh-56px)] mt-14">
        <BuildLoading />
      </div>
    );
  }

  /* ── Fullscreen Preview Overlay ── */
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium">Preview — {framework.toUpperCase()}</span>
          <div className="flex items-center gap-2">
            {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([vp, Icon]) => (
              <Button key={vp} variant={viewport === vp ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewport(vp)}>
                <Icon className="w-4 h-4" />
              </Button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(false)}>
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <BuildPreview files={files} framework={framework} viewport={viewport} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] mt-14 flex">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Pix Engineer",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            url: "https://pixengineer.com/",
            description:
              "AI app builder that turns text prompts into full-stack web apps, converts designs to code, and helps craft AI prompts.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@type": "Organization", name: "Pix Engineer", url: "https://pixengineer.com" },
          }),
        }}
      />
      <FeatureHistorySidebar
        items={historyItems}
        isLoading={buildsLoading}
        onSelect={loadBuild}
        onDelete={(id) => deleteBuildMutation.mutate(id)}
        onNewItem={newBuild}
        label="Projects"
        newLabel="New Project"
      />
      <div className="flex-1 min-w-0 flex flex-col">
        {isMobile && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/20 flex-shrink-0 pl-12">
            {(["chat", "preview", "code"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setMobilePane(p)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${mobilePane === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {isMobile ? (
          <div className="flex-1 min-h-0">
            {mobilePane === "chat" && (
              <ChatPanel messages={messages} isLoading={isLoading} onSend={handleSend} />
            )}
            {mobilePane === "preview" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([vp, Icon]) => (
                      <Button key={vp} variant={viewport === vp ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewport(vp)} aria-label={`${vp} viewport`}>
                        <Icon className="w-3.5 h-3.5" />
                      </Button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={downloadZip} disabled={displayFiles.length === 0}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>
                <div className="flex-1 min-h-0">
                  <BuildPreview files={files} framework={framework} viewport={viewport} />
                </div>
              </div>
            )}
            {mobilePane === "code" && (
              <div className="h-full flex flex-col">
                <div className="border-b border-border/50 bg-muted/20 flex-shrink-0 max-h-32 overflow-y-auto">
                  <FileExplorer files={displayFiles} selectedPath={selectedPath} onSelect={setSelectedPath} />
                </div>
                <div className="flex-1 min-h-0 bg-card/30">
                  <CodeViewer files={displayFiles} selectedPath={selectedPath} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <ChatPanel messages={messages} isLoading={isLoading} onSend={handleSend} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70} minSize={40}>
              <div className="h-full flex flex-col">
                {/* Toolbar: Tabs + Viewport + Actions */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRightTab("preview")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${rightTab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setRightTab("code")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${rightTab === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    >
                      Code
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {rightTab === "preview" && (
                      <>
                        {([ ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone] ] as const).map(([vp, Icon]) => (
                          <Button key={vp} variant={viewport === vp ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewport(vp)}>
                            <Icon className="w-3.5 h-3.5" />
                          </Button>
                        ))}
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(true)} title="Fullscreen preview">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={downloadZip} disabled={displayFiles.length === 0}>
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </div>
                </div>

                {rightTab === "preview" ? (
                  <div className="flex-1">
                    <BuildPreview files={files} framework={framework} viewport={viewport} />
                  </div>
                ) : (
                  <div className="flex-1 flex">
                    <ResizablePanelGroup direction="horizontal">
                      <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
                        <div className="h-full border-r border-border/50 bg-muted/20 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border/50">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</span>
                          </div>
                          <FileExplorer files={displayFiles} selectedPath={selectedPath} onSelect={setSelectedPath} />
                        </div>
                      </ResizablePanel>
                      <ResizableHandle />
                      <ResizablePanel defaultSize={75}>
                        <div className="h-full flex flex-col bg-card/30">
                          <CodeViewer files={displayFiles} selectedPath={selectedPath} />
                        </div>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
