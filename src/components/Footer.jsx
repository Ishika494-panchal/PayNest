function Footer() {
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
