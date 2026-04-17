import FeaturesGrid from '../components/FeaturesGrid'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import MissionSection from '../components/MissionSection'
import Navbar from '../components/Navbar'
import Testimonial from '../components/Testimonial'

function LandingPage({ isLoggedIn, userName, onLogout }) {
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <Navbar isLoggedIn={isLoggedIn} userName={userName} onLogout={onLogout} />
      <HeroSection />
      <HowItWorks />
      <FeaturesGrid />
      <MissionSection />
      <Testimonial />
      <Footer variant="landing" />
    </div>
  )
}

export default LandingPage
