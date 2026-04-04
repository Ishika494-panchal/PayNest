function Testimonial() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-14 text-center sm:px-6 lg:px-8">
      <p className="text-[42px] leading-none text-[#66739a]">"</p>
      <blockquote className="mx-auto mt-1 max-w-[760px] text-[28px] font-medium leading-[1.28] tracking-[-0.02em] text-[#2d2d2d]">
        PayNest helped me during heavy rain days when my bike deliveries were really
        impossible. The payout was instant and saved my weekly rent.
      </blockquote>
      <div className="mt-8 inline-flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
          alt="Priya profile"
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="text-left">
          <p className="text-[13px] font-semibold text-[#1f1f1f]">Priya S.</p>
          <p className="text-[11px] text-[#8a8a8a]">Delivery Partner</p>
        </div>
      </div>
    </section>
  )
}

export default Testimonial
