import { Globe, Mail, MessageCircle, Phone } from 'lucide-react'

function Footer({ variant = 'default' }) {
  if (variant === 'landing') {
    return (
      <footer className="bg-[#1f1e3b] text-[#f2f0e9]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.05fr_1fr_1fr_1fr_1fr]">
            <div>
              <p className="text-[34px] font-semibold leading-[0.9] tracking-[-0.02em] text-[#f18bc1]">PayNest</p>
              <p className="mt-2 text-[12px] text-[#c3c0d8]">Juntos es mejor</p>
              <div className="mt-5 flex items-center gap-3 text-[#f3efff]">
                <a href="#" aria-label="Website" className="hover:text-[#f0ce49]">
                  <Globe className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Support Chat" className="hover:text-[#f0ce49]">
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Support Phone" className="hover:text-[#f0ce49]">
                  <Phone className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Mail" className="hover:text-[#f0ce49]">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#f0ce49]">PayNest</p>
              <div className="mt-3 space-y-2 text-[14px] text-[#ece8f8]">
                <a href="#" className="block hover:text-[#f0ce49]">
                  Careers
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Blog
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Community Fund
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Risk Disclosure
                </a>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#f0ce49]">Ways To Shop</p>
              <div className="mt-3 space-y-2 text-[14px] text-[#ece8f8]">
                <a href="#" className="block hover:text-[#f0ce49]">
                  Subscribe & Save
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Coverage Plans
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Find Coverage
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Enterprise
                </a>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#f0ce49]">My Account</p>
              <div className="mt-3 space-y-2 text-[14px] text-[#ece8f8]">
                <a href="#" className="block hover:text-[#f0ce49]">
                  My Account
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Orders & Subscriptions
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Claims & Coverage
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Rewards
                </a>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#f0ce49]">Help & FAQs</p>
              <div className="mt-3 space-y-2 text-[14px] text-[#ece8f8]">
                <a href="#" className="block hover:text-[#f0ce49]">
                  Contact Us
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  FAQ
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Terms of Service
                </a>
                <a href="#" className="block hover:text-[#f0ce49]">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[#3f3b64] pt-4 text-[12px] text-[#c3c0d8]">
            © 2026 PayNest Inc.
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-[#e7e1d8] bg-[#f6f3ed]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-8 text-[12px] text-[#8f8f8f] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>PayNest Inc.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-[#3f3f3f]">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-[#3f3f3f]">
            Terms of Service
          </a>
          <a href="#" className="hover:text-[#3f3f3f]">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
