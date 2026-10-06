import React, { useState, useEffect } from 'react';
import { fmtCookies } from './clickerLogic.js';
import {
  GEM_PERKS,
  getDiamondOvenCost,
  MAX_DIAMOND_OVENS,
  TIME_WARP_COOLDOWN_MS,
  GOLD_FRENZY_COOLDOWN_MS,
} from './gemPerks.js';
import SlotsPage from '../slots/SlotsPage.jsx';
import BlackjackPage from '../blackjack/BlackjackPage.jsx';
import CurrencyExchangeModal from '../../components/CurrencyExchangeModal.jsx';
import {
  playCoinSound,
  playWinChime,
  playLossSound,
} from '../../lib/casinoAudio.js';

export default function ClickerGamblingTab({
  cookies = 0,
  gems = 0,
  diamondOvens = 0,
  vipLuckyCharm = false,
  casinoInsuranceCharges = 0,
  unlockedGemSkins = [],
  currentCps = 0,
  lastTimeWarpUsed = 0,
  lastGoldFrenzyUsed = 0,
  onUpdateCookies,
  onUpdateGems,
  onBuyPerk,
  onUpdateState,
  onTriggerEvent,
  initialSubTab = 'coinflip',
}) {
  const [activeMainTab, setActiveMainTab] = useState(initialSubTab); // 'coinflip' | 'slots' | 'blackjack' | 'diamonds'
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Cooldown Ticker für VIP-Perks
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync if initialSubTab changes from URL
  useEffect(() => {
    if (initialSubTab) {
      setActiveMainTab(initialSubTab);
    }
  }, [initialSubTab]);

  // --- MÜNZWURF STATE & LOGIK ---
  const [coinBet, setCoinBet] = useState(1000);
  const [flippingCoin, setFlippingCoin] = useState(false);
  const [coinChoice, setCoinChoice] = useState('heads');
  const [coinResult, setCoinResult] = useState(null);
  const [coinStreak, setCoinStreak] = useState(0);
  const [coinMsg, setCoinMsg] = useState('');

  function handleCoinFlip(choice) {
    if (flippingCoin) return;
    const bet = Math.max(1, Math.min(Math.floor(cookies), Math.floor(Number(coinBet) || 0)));
    if (cookies < bet || bet <= 0) return;

    setFlippingCoin(true);
    setCoinChoice(choice);
    setCoinResult(null);
    setCoinMsg('Keks rotiert in der Luft...');
    playCoinSound();

    onUpdateCookies?.(-bet);

    setTimeout(() => {
      const isHeads = Math.random() < 0.5;
      const resultSide = isHeads ? 'heads' : 'tails';
      setCoinResult(resultSide);
      setFlippingCoin(false);

      if (choice === resultSide) {
        const nextStreak = coinStreak + 1;
        setCoinStreak(nextStreak);
        const streakBonus = nextStreak >= 3 ? 0.25 : 0;
        const vipBonus = vipLuckyCharm ? 0.05 : 0;
        const winAmount = Math.floor(bet * (2 + streakBonus + vipBonus));
        onUpdateCookies?.(winAmount);
        playWinChime();
        setCoinMsg(
          `🎉 GEWONNEN! +${fmtCookies(winAmount)} Cookies! ${
            nextStreak >= 3 ? `(🔥 ${nextStreak}x Streak-Bonus!)` : ''
          } ${vipLuckyCharm ? '(🍀 VIP +5%)' : ''}`
        );
      } else {
        setCoinStreak(0);
        playLossSound();
        setCoinMsg('💥 Leider verloren! Versuch es noch einmal.');
      }
    }, 900);
  }

  return (
    <div className="clicker-gambling-container">
      {/* Casino Navigation: Reine Sub-Tabs auf der Cookie Clicker Seite */}
      <div
        className="casino-nav-row"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          background: 'rgba(20, 20, 25, 0.75)',
          padding: '8px',
          borderRadius: '10px',
          border: '1px solid #282835',
        }}
      >
        <button
          className={`btn ${activeMainTab === 'coinflip' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 14px', fontSize: '0.54rem', flex: '1 1 auto' }}
          onClick={() => setActiveMainTab('coinflip')}
        >
          🪙 KEKS-MÜNZWURF
        </button>
        <button
          className={`btn ${activeMainTab === 'slots' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 14px', fontSize: '0.54rem', flex: '1 1 auto' }}
          onClick={() => setActiveMainTab('slots')}
        >
          🎰 SLOTS (SPIELAUTOMAT)
        </button>
        <button
          className={`btn ${activeMainTab === 'blackjack' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 14px', fontSize: '0.54rem', flex: '1 1 auto' }}
          onClick={() => setActiveMainTab('blackjack')}
        >
          🃏 BLACKJACK 21
        </button>
        <button
          className={`btn ${activeMainTab === 'diamonds' ? 'btn-primary' : 'btn-outline'}`}
          style={{
            padding: '8px 14px',
            fontSize: '0.54rem',
            flex: '1 1 auto',
            background: activeMainTab === 'diamonds' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'transparent',
            borderColor: '#00f2fe',
            color: activeMainTab === 'diamonds' ? '#000' : '#00f2fe',
            fontWeight: 'bold',
          }}
          onClick={() => setActiveMainTab('diamonds')}
        >
          💎 VIP DIAMANTEN-SHOP ({gems})
        </button>
      </div>

      {/* ============================================================
          TAB 1: KEKS-MÜNZWURF (FOKUSSIERT & SCHNELL)
          ============================================================ */}
      {activeMainTab === 'coinflip' && (
        <div
          className="casino-box"
          style={{
            background: '#131313',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #282828',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.74rem', color: 'var(--accent)', margin: 0 }}>
              🪙 DOUBLE-OR-NOTHING KEKS-MÜNZWURF
            </h3>
            {coinStreak >= 2 && (
              <span style={{ fontSize: '0.5rem', fontFamily: 'var(--font-pixel)', color: '#ff4d6d', background: 'rgba(255,77,109,0.15)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,77,109,0.3)' }}>
                🔥 {coinStreak}x GEWINN-SERIE (+25% BONUS)
              </span>
            )}
          </div>

          <div style={{ textAlign: 'center', margin: '24px 0', minHeight: '100px' }}>
            <div
              style={{
                fontSize: '5rem',
                transition: 'transform 0.4s ease',
                display: 'inline-block',
                animation: flippingCoin ? 'spinSlow 0.3s linear infinite' : 'none',
                filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.4))',
              }}
            >
              {coinResult === 'heads' ? '🍪' : coinResult === 'tails' ? '👑' : '🪙'}
            </div>
            {coinMsg && (
              <div
                style={{
                  marginTop: '16px',
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '0.64rem',
                  color: coinMsg.includes('GEWONNEN') ? '#39ff14' : coinMsg.includes('verloren') ? '#ff4444' : 'var(--accent)',
                  textShadow: '0 0 10px currentColor',
                }}
              >
                {coinMsg}
              </div>
            )}
          </div>

          {/* Einsatz-Eingabe */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.5rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>
                DEIN EINSATZ:
              </label>
              <span style={{ fontSize: '0.5rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)' }}>
                Guthaben: {fmtCookies(cookies)} 🍪
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max={cookies}
                value={coinBet}
                onChange={(e) => setCoinBet(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="custom-bet-input"
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                disabled={flippingCoin}
              />
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.48rem', padding: '6px 12px' }}
                onClick={() => setCoinBet(Math.max(1, Math.floor(cookies * 0.25)))}
                disabled={flippingCoin || cookies <= 0}
              >
                25%
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.48rem', padding: '6px 12px' }}
                onClick={() => setCoinBet(Math.max(1, Math.floor(cookies * 0.5)))}
                disabled={flippingCoin || cookies <= 0}
              >
                50%
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.48rem', padding: '6px 12px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => setCoinBet(Math.floor(cookies))}
                disabled={flippingCoin || cookies <= 0}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Münzwurf Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '14px', fontSize: '0.62rem' }}
              onClick={() => handleCoinFlip('heads')}
              disabled={flippingCoin || cookies < coinBet || coinBet <= 0}
            >
              🍪 AUF KEKS SETZEN
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '14px', fontSize: '0.62rem', background: 'linear-gradient(135deg, #7209b7, #4361ee)' }}
              onClick={() => handleCoinFlip('tails')}
              disabled={flippingCoin || cookies < coinBet || coinBet <= 0}
            >
              👑 AUF KRONE SETZEN
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: SLOTS (VOLLSTÄNDIG EINGEBETTET)
          ============================================================ */}
      {activeMainTab === 'slots' && (
        <div className="embedded-slots-wrap">
          <SlotsPage embedded={true} />
        </div>
      )}

      {/* ============================================================
          TAB 3: BLACKJACK (VOLLSTÄNDIG EINGEBETTET)
          ============================================================ */}
      {activeMainTab === 'blackjack' && (
        <div className="embedded-blackjack-wrap">
          <BlackjackPage embedded={true} />
        </div>
      )}

      {/* ============================================================
          TAB 4: VIP DIAMANTEN-SHOP (UTILITY FOR GEMS)
          ============================================================ */}
      {activeMainTab === 'diamonds' && (
        <div className="diamonds-vip-shop" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Balance */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.12), rgba(79, 172, 254, 0.08))',
              border: '2px solid rgba(0, 242, 254, 0.4)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.9rem', color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💎 DEIN VIP-GUTHABEN:</span>
                <span style={{ color: '#fff', textShadow: '0 0 12px #00f2fe' }}>{Number(gems || 0).toLocaleString('de-DE')}</span>
                <span>DIAMANTEN</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>
                Nutze deine Diamanten für Zeit-Reisen, permanente Öfen, Casino-Versicherungen & VIP-Glück!
              </div>
            </div>
            <button
              className="btn btn-outline"
              style={{ borderColor: '#00f2fe', color: '#00f2fe', fontSize: '0.54rem', padding: '8px 14px' }}
              onClick={() => setExchangeOpen(true)}
            >
              💱 WECHSELSTUBE (DIAMANTEN TAUSCHEN)
            </button>
          </div>

          {/* Aktive Buffs Leiste */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
            }}
          >
            <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>DIAMANTEN-ÖFEN</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-pixel)', color: '#a855f7', marginTop: '4px' }}>
                {diamondOvens}/{MAX_DIAMOND_OVENS} Aktiv (+{diamondOvens * 5}% CPS)
              </div>
            </div>
            <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>VIP CASINO-GLÜCKSKLEE</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-pixel)', color: vipLuckyCharm ? '#39ff14' : 'var(--muted)', marginTop: '4px' }}>
                {vipLuckyCharm ? '🍀 AKTIV (+5% GEWINNE)' : 'NICHT AKTIV'}
              </div>
            </div>
            <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>CASINO-VERSICHERUNG</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-pixel)', color: casinoInsuranceCharges > 0 ? '#3a86ff' : 'var(--muted)', marginTop: '4px' }}>
                {casinoInsuranceCharges > 0 ? `🛡️ ${casinoInsuranceCharges}/3 LADUNGEN (25%)` : '0/3 LADUNGEN'}
              </div>
            </div>
            <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>KRISTALL-MORITZ SKIN</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-pixel)', color: unlockedGemSkins?.includes('crystal') ? '#00f2fe' : 'var(--muted)', marginTop: '4px' }}>
                {unlockedGemSkins?.includes('crystal') ? '✨ AKTIV (+5% KLICK)' : 'GESPERRT'}
              </div>
            </div>
          </div>

          {/* Perks Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {GEM_PERKS.map((perk) => {
              let cost = perk.cost;
              let isMaxed = false;
              let cooldownMs = 0;

              if (perk.id === 'diamond_oven') {
                cost = getDiamondOvenCost(diamondOvens);
                isMaxed = diamondOvens >= MAX_DIAMOND_OVENS;
              } else if (perk.id === 'time_warp') {
                cooldownMs = Math.max(0, (lastTimeWarpUsed + TIME_WARP_COOLDOWN_MS) - now);
              } else if (perk.id === 'gold_frenzy') {
                cooldownMs = Math.max(0, (lastGoldFrenzyUsed + GOLD_FRENZY_COOLDOWN_MS) - now);
              } else if (perk.id === 'casino_insurance') {
                isMaxed = casinoInsuranceCharges >= 3;
              }

              const isPurchasedPermanent =
                (perk.id === 'lucky_clover' && vipLuckyCharm) ||
                (perk.id === 'crystal_skin' && unlockedGemSkins?.includes('crystal'));

              const onCooldown = cooldownMs > 0;
              const canAfford = cost !== null && gems >= cost;
              const canBuy = !isPurchasedPermanent && !isMaxed && !onCooldown && canAfford;

              const cdMinutes = Math.floor(cooldownMs / 60000);
              const cdSeconds = Math.floor((cooldownMs % 60000) / 1000);
              const cdString = `${cdMinutes}:${cdSeconds.toString().padStart(2, '0')}`;

              let badgeText = perk.badge;
              if (onCooldown) {
                badgeText = `⏳ COOLDOWN ${cdString}`;
              } else if (perk.id === 'diamond_oven') {
                badgeText = `${diamondOvens}/${MAX_DIAMOND_OVENS} GEKAUFT`;
              } else if (perk.id === 'casino_insurance') {
                badgeText = `${casinoInsuranceCharges}/3 LADUNGEN`;
              }

              return (
                <div
                  key={perk.id}
                  style={{
                    background: '#141418',
                    border: `1px solid ${isPurchasedPermanent ? '#39ff14' : onCooldown ? '#ff9e00' : perk.color}`,
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    opacity: isPurchasedPermanent || (isMaxed && perk.id !== 'casino_insurance') ? 0.75 : 1,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{perk.icon}</span>
                      <span
                        style={{
                          fontSize: '0.42rem',
                          fontFamily: 'var(--font-pixel)',
                          background: onCooldown ? '#ff9e0022' : `${perk.color}22`,
                          color: onCooldown ? '#ff9e00' : perk.color,
                          border: `1px solid ${onCooldown ? '#ff9e0066' : `${perk.color}66`}`,
                          padding: '3px 7px',
                          borderRadius: '4px',
                        }}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.68rem', color: '#fff', marginBottom: '6px' }}>
                      {perk.name}
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#aaa', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                      {perk.desc}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #222' }}>
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem', color: '#00f2fe' }}>
                      {perk.id === 'diamond_oven' ? (
                        isMaxed ? '💎 MAX' : `💎 ${cost} (Stufe ${diamondOvens + 1})`
                      ) : (
                        `💎 ${cost}`
                      )}
                    </div>
                    {isPurchasedPermanent ? (
                      <button
                        className="btn btn-outline"
                        disabled
                        style={{ fontSize: '0.48rem', padding: '6px 12px', borderColor: '#39ff14', color: '#39ff14' }}
                      >
                        BEREITS AKTIV ✓
                      </button>
                    ) : isMaxed && perk.id === 'diamond_oven' ? (
                      <button
                        className="btn btn-outline"
                        disabled
                        style={{ fontSize: '0.48rem', padding: '6px 12px', borderColor: '#888', color: '#888' }}
                      >
                        MAXIMAL (5/5) ✓
                      </button>
                    ) : isMaxed && perk.id === 'casino_insurance' ? (
                      <button
                        className="btn btn-outline"
                        disabled
                        style={{ fontSize: '0.48rem', padding: '6px 12px', borderColor: '#3a86ff', color: '#3a86ff' }}
                      >
                        VOLL (3/3) ✓
                      </button>
                    ) : onCooldown ? (
                      <button
                        className="btn btn-outline"
                        disabled
                        style={{ fontSize: '0.46rem', padding: '6px 10px', borderColor: '#ff9e00', color: '#ff9e00' }}
                      >
                        ⏳ WARTEN ({cdString})
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={!canBuy}
                        style={{
                          fontSize: '0.48rem',
                          padding: '7px 14px',
                          background: canBuy ? `linear-gradient(135deg, ${perk.color}, #4facfe)` : '#333',
                          borderColor: canBuy ? perk.color : '#444',
                          color: canBuy ? '#000' : '#888',
                          fontWeight: 'bold',
                        }}
                        onClick={() => onBuyPerk?.(perk)}
                      >
                        {canBuy
                          ? (perk.id === 'diamond_oven'
                            ? `KAUFEN (${cost} 💎)`
                            : `KAUFEN (${cost} 💎)`)
                          : 'ZU WENIG 💎'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wechselstuben-Modal */}
      <CurrencyExchangeModal
        isOpen={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        state={{ cookies, gems }}
        onExchange={(newState) => onUpdateState?.(newState)}
      />
    </div>
  );
}
