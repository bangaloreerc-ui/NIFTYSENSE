/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Info, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, ChevronRight, X, ArrowRight, Split } from 'lucide-react';

// --- Types ---

enum Bias {
  Bullish = 'Bullish',
  Bearish = 'Bearish',
  Neutral = 'Neutral',
  Complex = 'Complex'
}

enum Risk {
  Limited = 'Limited',
  Unlimited = 'Unlimited'
}

enum Level {
  Novice = 'Novice',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
  Expert = 'Expert'
}

interface Leg {
  action: 'BUY' | 'SELL' | 'OWN';
  type: 'CALL' | 'PUT' | 'UNDERLYING';
  strike?: string;
  quantity: string | number;
}

interface Strategy {
  id: string;
  name: string;
  level: Level;
  category: string;
  bias: Bias;
  riskProfit: string;
  riskLoss: string;
  description: string;
  legs: (Leg | string)[];
  alsoKnownAs?: string;
  diagramType: string;
}

// --- Data ---

const STRATEGIES: Strategy[] = [
  // NOVICE
  {
    id: 'long-call',
    name: 'Long Call',
    level: Level.Novice,
    category: 'BASIC',
    bias: Bias.Bullish,
    riskProfit: 'Unlimited Profit',
    riskLoss: 'Limited Loss',
    description: 'The most basic bullish strategy. You buy the right to purchase the underlying stock at a specific price. Use this when you expect a significant price increase in a short period.',
    legs: [
      { action: 'BUY', quantity: 1, type: 'CALL', strike: 'Strike A' }
    ],
    diagramType: 'long-call'
  },
  {
    id: 'long-put',
    name: 'Long Put',
    level: Level.Novice,
    category: 'BASIC',
    bias: Bias.Bearish,
    riskProfit: 'Limited Profit (stock to 0)',
    riskLoss: 'Limited Loss',
    description: 'The basic bearish strategy. You buy the right to sell the stock at a set price. It profits as the stock price falls below your strike price minus the premium paid.',
    legs: [
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'long-put'
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    level: Level.Novice,
    category: 'INCOME',
    bias: Bias.Neutral,
    riskProfit: 'Limited Profit',
    riskLoss: 'Unlimited Risk (stock can drop)',
    description: 'An income strategy where you own the underlying stock and sell a call against it. You collect the premium in exchange for capped upside potential.',
    legs: [
      { action: 'OWN', quantity: '1 lot', type: 'UNDERLYING' },
      { action: 'SELL', quantity: 1, type: 'CALL', strike: 'Strike A' }
    ],
    diagramType: 'covered-call'
  },
  {
    id: 'cash-secured-put',
    name: 'Cash-Secured Put',
    level: Level.Novice,
    category: 'INCOME',
    bias: Bias.Neutral,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss (stock to 0)',
    description: 'Selling a put option while keeping enough cash to buy the stock if assigned. It is a way to get paid to wait to buy a stock at a lower price.',
    legs: [
      { action: 'SELL', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'short-put'
  },
  {
    id: 'protective-put',
    name: 'Protective Put',
    level: Level.Novice,
    category: 'OTHER',
    bias: Bias.Complex,
    riskProfit: 'Unlimited Profit',
    riskLoss: 'Limited Loss',
    description: 'Also known as "portfolio insurance." You own the stock and buy a put to create a floor on your possible losses if the stock price crashes.',
    legs: [
      { action: 'OWN', quantity: '1 lot', type: 'UNDERLYING' },
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'protective-put',
    alsoKnownAs: 'Married Put'
  },

  // INTERMEDIATE
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    level: Level.Intermediate,
    category: 'CREDIT SPREADS',
    bias: Bias.Bullish,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss',
    description: 'A bullish credit spread where you sell a higher strike put and buy a lower strike put for protection. Profits when the stock stays above the higher strike.',
    legs: [
      { action: 'SELL', quantity: 1, type: 'PUT', strike: 'Strike B' },
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'bull-spread',
    alsoKnownAs: 'Short Put Spread'
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    level: Level.Intermediate,
    category: 'CREDIT SPREADS',
    bias: Bias.Bearish,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss',
    description: 'A bearish credit spread where you sell a lower strike call and buy a higher strike call. It profits if the stock price stays below the lower strike.',
    legs: [
      { action: 'SELL', quantity: 1, type: 'CALL', strike: 'Strike A' },
      { action: 'BUY', quantity: 1, type: 'CALL', strike: 'Strike B' }
    ],
    diagramType: 'bear-spread',
    alsoKnownAs: 'Short Call Spread'
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly',
    level: Level.Intermediate,
    category: 'NEUTRAL',
    bias: Bias.Neutral,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss',
    description: 'A neutral strategy combining a bear call spread and a bull put spread at the same middle strike. Profits most when the stock stays near the center strike.',
    legs: [
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' },
      { action: 'SELL', quantity: 1, type: 'PUT', strike: 'Strike B' },
      { action: 'SELL', quantity: 1, type: 'CALL', strike: 'Strike B' },
      { action: 'BUY', quantity: 1, type: 'CALL', strike: 'Strike C' }
    ],
    diagramType: 'butterfly'
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    level: Level.Intermediate,
    category: 'NEUTRAL',
    bias: Bias.Neutral,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss',
    description: 'A non-directional strategy that profits if the underlying stays within a specific price range. It uses four options with different strikes to create a wide "profit tent."',
    legs: [
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' },
      { action: 'SELL', quantity: 1, type: 'PUT', strike: 'Strike B' },
      { action: 'SELL', quantity: 1, type: 'CALL', strike: 'Strike C' },
      { action: 'BUY', quantity: 1, type: 'CALL', strike: 'Strike D' }
    ],
    diagramType: 'iron-condor'
  },
  {
    id: 'straddle',
    name: 'Straddle',
    level: Level.Intermediate,
    category: 'DIRECTIONAL',
    bias: Bias.Complex,
    riskProfit: 'Unlimited Profit',
    riskLoss: 'Limited Loss',
    description: 'Buying both a call and a put at the same strike and expiration. Use this when you expect a massive move in either direction but are unsure which way.',
    legs: [
      { action: 'BUY', quantity: 1, type: 'CALL', strike: 'Strike A' },
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'straddle',
    alsoKnownAs: 'Long Straddle'
  },
  {
    id: 'collar',
    name: 'Collar',
    level: Level.Intermediate,
    category: 'OTHER',
    bias: Bias.Neutral,
    riskProfit: 'Limited Profit',
    riskLoss: 'Limited Loss',
    description: 'Protective strategy for stock you already own. You buy a protective put and finance it by selling a covered call. It caps both your upside and your downside.',
    legs: [
      { action: 'OWN', quantity: '1 lot', type: 'UNDERLYING' },
      { action: 'BUY', quantity: 1, type: 'PUT', strike: 'Strike A' },
      { action: 'SELL', quantity: 1, type: 'CALL', strike: 'Strike B' }
    ],
    diagramType: 'collar'
  },
  {
    id: 'short-put',
    name: 'Short Put',
    level: Level.Advanced,
    category: 'NAKED',
    bias: Bias.Bullish,
    riskProfit: 'Limited Profit',
    riskLoss: 'Unlimited Risk (stock to 0)',
    description: 'Selling a put without owning the underlying or having cash to secure it. It is inherently bullish as you profit if the stock price remains above the strike.',
    legs: [
      { action: 'SELL', quantity: 1, type: 'PUT', strike: 'Strike A' }
    ],
    diagramType: 'short-put',
    alsoKnownAs: 'Naked Put'
  }
];

// Add stubs for the rest of the strategies mentioned in the prompt
const OTHER_STRATEGIES = [
  // Novice
  { id: 'csp', name: 'Cash-Secured Put', level: Level.Novice, category: 'INCOME', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  // Intermediate
  { id: 'lp-fly', name: 'Long Put Butterfly', level: Level.Intermediate, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'lc-fly', name: 'Long Call Butterfly', level: Level.Intermediate, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cc-spread', name: 'Calendar Call Spread', level: Level.Intermediate, category: 'CALENDAR SPREADS', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cp-spread', name: 'Calendar Put Spread', level: Level.Intermediate, category: 'CALENDAR SPREADS', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'dc-spread', name: 'Diagonal Call Spread', level: Level.Intermediate, category: 'CALENDAR SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'dp-spread', name: 'Diagonal Put Spread', level: Level.Intermediate, category: 'CALENDAR SPREADS', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'bc-spread', name: 'Bull Call Spread', level: Level.Intermediate, category: 'DEBIT SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'bp-spread', name: 'Bear Put Spread', level: Level.Intermediate, category: 'DEBIT SPREADS', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'inv-ib', name: 'Inverse Iron Butterfly', level: Level.Intermediate, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'inv-ic', name: 'Inverse Iron Condor', level: Level.Intermediate, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'sp-fly', name: 'Short Put Butterfly', level: Level.Intermediate, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'sc-fly', name: 'Short Call Butterfly', level: Level.Intermediate, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'strangle', name: 'Strangle', level: Level.Intermediate, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  
  // Advanced
  { id: 'short-call', name: 'Short Call', level: Level.Advanced, category: 'NAKED', bias: Bias.Bearish, riskLoss: 'Unlimited Risk', riskProfit: 'Limited Profit' },
  { id: 's-straddle', name: 'Short Straddle', level: Level.Advanced, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Unlimited Risk', riskProfit: 'Limited Profit' },
  { id: 's-strangle', name: 'Short Strangle', level: Level.Advanced, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Unlimited Risk', riskProfit: 'Limited Profit' },
  { id: 'lc-condor', name: 'Long Call Condor', level: Level.Advanced, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'lp-condor', name: 'Long Put Condor', level: Level.Advanced, category: 'NEUTRAL', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cr-back', name: 'Call Ratio Backspread', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'pw-wing', name: 'Put Broken Wing', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'ic-wing', name: 'Inverse Call Broken Wing', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'pr-back', name: 'Put Ratio Backspread', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cb-wing', name: 'Call Broken Wing', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'ip-wing', name: 'Inverse Put Broken Wing', level: Level.Advanced, category: 'RATIO SPREADS', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cs-straddle', name: 'Covered Short Straddle', level: Level.Advanced, category: 'INCOME', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'cs-strangle', name: 'Covered Short Strangle', level: Level.Advanced, category: 'INCOME', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'sc-condor', name: 'Short Call Condor', level: Level.Advanced, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'sp-condor', name: 'Short Put Condor', level: Level.Advanced, category: 'DIRECTIONAL', bias: Bias.Complex, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'bc-ladder', name: 'Bull Call Ladder', level: Level.Advanced, category: 'LADDERS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'bear-c-ladder', name: 'Bear Call Ladder', level: Level.Advanced, category: 'LADDERS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'bp-ladder', name: 'Bull Put Ladder', level: Level.Advanced, category: 'LADDERS', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'bear-p-ladder', name: 'Bear Put Ladder', level: Level.Advanced, category: 'LADDERS', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'jade-liz', name: 'Jade Lizard', level: Level.Advanced, category: 'OTHER', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'rev-jade', name: 'Reverse Jade Lizard', level: Level.Advanced, category: 'OTHER', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },

  // Expert
  { id: 'c-ratio', name: 'Call Ratio Spread', level: Level.Expert, category: 'RATIO SPREADS', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'p-ratio', name: 'Put Ratio Spread', level: Level.Expert, category: 'RATIO SPREADS', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'l-syn-f', name: 'Long Synthetic Future', level: Level.Expert, category: 'SYNTHETIC', bias: Bias.Bullish, riskLoss: 'Unlimited Risk', riskProfit: 'Unlimited Profit' },
  { id: 's-syn-f', name: 'Short Synthetic Future', level: Level.Expert, category: 'SYNTHETIC', bias: Bias.Bearish, riskLoss: 'Unlimited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'syn-put', name: 'Synthetic Put', level: Level.Expert, category: 'SYNTHETIC', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
  { id: 'l-combo', name: 'Long Combo', level: Level.Expert, category: 'ARBITRAGE', bias: Bias.Bullish, riskLoss: 'Unlimited Risk', riskProfit: 'Unlimited Profit' },
  { id: 's-combo', name: 'Short Combo', level: Level.Expert, category: 'ARBITRAGE', bias: Bias.Bearish, riskLoss: 'Unlimited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'strip', name: 'Strip', level: Level.Expert, category: 'OTHER', bias: Bias.Bearish, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'strap', name: 'Strap', level: Level.Expert, category: 'OTHER', bias: Bias.Bullish, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 'guts', name: 'Guts', level: Level.Expert, category: 'OTHER', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Unlimited Profit' },
  { id: 's-guts', name: 'Short Guts', level: Level.Expert, category: 'OTHER', bias: Bias.Neutral, riskLoss: 'Unlimited Risk', riskProfit: 'Limited Profit' },
  { id: 'dbl-diag', name: 'Double Diagonal', level: Level.Expert, category: 'OTHER', bias: Bias.Neutral, riskLoss: 'Limited Risk', riskProfit: 'Limited Profit' },
];

const STUB_DESCRIPTION = "Description coming soon. This strategy involves complex mechanics typically used by experienced traders to manage specific risk parameters or harness volatility.";

const ALL_STRATEGIES: Strategy[] = [
  ...STRATEGIES,
  ...OTHER_STRATEGIES.filter(s => !STRATEGIES.find(base => base.id === s.id)).map(s => ({
    ...s,
    riskProfit: 'Loading...',
    riskLoss: 'Loading...',
    description: STUB_DESCRIPTION,
    legs: ['Loading...'],
    diagramType: 'stub'
  }))
] as Strategy[];

// --- Components ---

const BiasBadge = ({ bias, showLabel = true }: { bias: Bias; showLabel?: boolean }) => {
  const config = {
    [Bias.Bullish]: { 
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', 
      iconColor: 'bg-emerald-500 text-slate-950',
      icon: TrendingUp, 
      label: 'Bullish' 
    },
    [Bias.Bearish]: { 
      color: 'text-rose-400 border-rose-500/20 bg-rose-500/10', 
      iconColor: 'bg-rose-500 text-slate-950',
      icon: TrendingDown, 
      label: 'Bearish' 
    },
    [Bias.Neutral]: { 
      color: 'text-slate-400 border-slate-700 bg-slate-800/50', 
      iconColor: 'bg-slate-700 text-slate-300',
      icon: ArrowRight, 
      label: 'Neutral' 
    },
    [Bias.Complex]: { 
      color: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/10', 
      iconColor: 'bg-fuchsia-500 text-slate-950',
      icon: Split, 
      label: 'Directional' 
    }
  };
  const { color, iconColor, icon: Icon, label } = config[bias];
  
  return (
    <div className={`flex items-center gap-2 ${showLabel ? 'px-2.5 py-1 rounded-full border' : ''} ${showLabel ? color : ''} transition-all duration-300 group`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${iconColor} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
        <Icon size={14} strokeWidth={3} />
      </div>
      {showLabel && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
    </div>
  );
};

const PLDiagram = ({ type }: { type: string }) => {
  const width = 400;
  const height = 200;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;
  const centerY = margin.top + graphHeight / 2;

  // Define strike points for each diagram type to position labels dynamically
  const strikePoints = useMemo(() => {
    switch (type) {
      case 'long-call':
        return [{ x: margin.left + graphWidth * 0.4, label: 'A' }];
      case 'long-put':
        return [{ x: margin.left + graphWidth * 0.6, label: 'A' }];
      case 'covered-call':
        return [{ x: margin.left + graphWidth * 0.7, label: 'A' }];
      case 'short-put':
        return [{ x: margin.left + graphWidth * 0.3, label: 'A' }];
      case 'protective-put':
        return [{ x: margin.left + graphWidth * 0.3, label: 'A' }];
      case 'bull-spread':
        return [
          { x: margin.left + graphWidth * 0.3, label: 'A' },
          { x: margin.left + graphWidth * 0.7, label: 'B' },
        ];
      case 'bear-spread':
        return [
          { x: margin.left + graphWidth * 0.3, label: 'A' },
          { x: margin.left + graphWidth * 0.7, label: 'B' },
        ];
      case 'butterfly':
        return [
          { x: margin.left + graphWidth * 0.2, label: 'A' },
          { x: margin.left + graphWidth * 0.5, label: 'B' },
          { x: margin.left + graphWidth * 0.8, label: 'C' },
        ];
      case 'iron-condor':
        return [
          { x: margin.left + graphWidth * 0.2, label: 'A' },
          { x: margin.left + graphWidth * 0.35, label: 'B' },
          { x: margin.left + graphWidth * 0.65, label: 'C' },
          { x: margin.left + graphWidth * 0.8, label: 'D' },
        ];
      case 'straddle':
        return [{ x: margin.left + graphWidth * 0.5, label: 'A' }];
      case 'collar':
        return [
          { x: margin.left + graphWidth * 0.3, label: 'A' },
          { x: margin.left + graphWidth * 0.7, label: 'B' },
        ];
      default:
        return [];
    }
  }, [type, graphWidth, margin.left]);

  // Generate path data based on strategy type using dynamic strike points
  const getPath = () => {
    const left = margin.left;
    const right = margin.left + graphWidth;
    const baseProfit = 40;
    const baseLoss = 40;
    
    // Helper to get x by label
    const getX = (label: string) => strikePoints.find(p => p.label === label)?.x || left;

    switch (type) {
      case 'long-call': {
        const a = getX('A');
        return `M ${left} ${centerY + baseLoss} L ${a} ${centerY + baseLoss} L ${right} ${centerY - baseProfit * 1.5}`;
      }
      case 'long-put': {
        const a = getX('A');
        return `M ${left} ${centerY - baseProfit * 1.5} L ${a} ${centerY + baseLoss} L ${right} ${centerY + baseLoss}`;
      }
      case 'covered-call': {
        const a = getX('A');
        return `M ${left} ${centerY + baseLoss * 1.5} L ${a} ${centerY - baseProfit} L ${right} ${centerY - baseProfit}`;
      }
      case 'short-put': {
        const a = getX('A');
        return `M ${left} ${centerY + baseLoss * 1.5} L ${a} ${centerY - baseProfit} L ${right} ${centerY - baseProfit}`;
      }
      case 'protective-put': {
        const a = getX('A');
        return `M ${left} ${centerY + baseLoss / 2} L ${a} ${centerY + baseLoss / 2} L ${right} ${centerY - baseProfit * 2}`;
      }
      case 'bull-spread': {
        const a = getX('A');
        const b = getX('B');
        return `M ${left} ${centerY + baseLoss} L ${a} ${centerY + baseLoss} L ${b} ${centerY - baseProfit} L ${right} ${centerY - baseProfit}`;
      }
      case 'bear-spread': {
        const a = getX('A');
        const b = getX('B');
        return `M ${left} ${centerY - baseProfit} L ${a} ${centerY - baseProfit} L ${b} ${centerY + baseLoss} L ${right} ${centerY + baseLoss}`;
      }
      case 'butterfly': {
        const a = getX('A');
        const b = getX('B');
        const c = getX('C');
        return `M ${left} ${centerY + baseLoss} L ${a} ${centerY + baseLoss} L ${b} ${centerY - baseProfit * 1.5} L ${c} ${centerY + baseLoss} L ${right} ${centerY + baseLoss}`;
      }
      case 'iron-condor': {
        const a = getX('A');
        const b = getX('B');
        const c = getX('C');
        const d = getX('D');
        return `M ${left} ${centerY + baseLoss} L ${a} ${centerY + baseLoss} L ${b} ${centerY - baseProfit} L ${c} ${centerY - baseProfit} L ${d} ${centerY + baseLoss} L ${right} ${centerY + baseLoss}`;
      }
      case 'straddle': {
        const a = getX('A');
        return `M ${left} ${centerY - baseProfit * 1.5} L ${a} ${centerY + baseLoss} L ${right} ${centerY - baseProfit * 1.5}`;
      }
      case 'collar': {
        const a = getX('A');
        const b = getX('B');
        return `M ${left} ${centerY + baseLoss} L ${a} ${centerY + baseLoss} L ${b} ${centerY - baseProfit} L ${right} ${centerY - baseProfit}`;
      }
      default:
        return `M ${left} ${centerY} L ${right} ${centerY}`;
    }
  };

  const pathD = getPath();

  return (
    <div className="relative bg-[#0d1b2a] rounded-xl p-4 border border-slate-800 shadow-inner group overflow-hidden">
      {/* Legend Labels */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-28 pointer-events-none z-10">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] rotate-[-90deg]">PROFIT</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] rotate-[-90deg]">LOSS</span>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <clipPath id="clip-profit">
            <rect x="0" y="0" width={width} height={centerY} />
          </clipPath>
          <clipPath id="clip-loss">
            <rect x="0" y={centerY} width={width} height={height} />
          </clipPath>
          <filter id="glow-fx" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Y-Axis Limit Labels */}
        <text 
          x={margin.left - 10} y={margin.top + 10} 
          textAnchor="end" 
          fill="#10b981" fillOpacity="0.8" 
          fontSize="9" fontWeight="900"
          className="font-mono uppercase tracking-tighter"
        >
          Max Profit
        </text>
        <text 
          x={margin.left - 10} y={height - margin.bottom - 5} 
          textAnchor="end" 
          fill="#f43f5e" fillOpacity="0.8" 
          fontSize="9" fontWeight="900" 
          className="font-mono uppercase tracking-tighter"
        >
          Max Loss
        </text>

        {/* X-Axis (Break-even) */}
        <line 
          x1={margin.left - 20} y1={centerY} 
          x2={width - margin.right + 20} y2={centerY} 
          stroke="white" strokeWidth="1" strokeOpacity="0.2" 
        />

        {/* ATM Reference */}
        <line 
          x1={margin.left + graphWidth / 2} y1={margin.top - 10} 
          x2={margin.left + graphWidth / 2} y2={height - margin.bottom + 10} 
          stroke="white" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="3 4" 
        />

        {/* Area Fills using Clip Paths for clear separation */}
        <path d={`${pathD} L ${width - margin.right} ${centerY} L ${margin.left} ${centerY} Z`} fill="#10b981" fillOpacity="0.1" clipPath="url(#clip-profit)" />
        <path d={`${pathD} L ${width - margin.right} ${centerY} L ${margin.left} ${centerY} Z`} fill="#f43f5e" fillOpacity="0.1" clipPath="url(#clip-loss)" />

        {/* The Payoff Curve Line */}
        <path 
          d={pathD} 
          fill="none" 
          strokeWidth="3.5" 
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
          style={{ 
            stroke: type === 'stub' ? '#475569' : '#10b981',
            filter: 'url(#glow-fx)'
          }}
        />

        {/* Strike Labels & Ticks - Precisely placed */}
        {strikePoints.map((point) => (
          <g key={point.label} className="transition-all duration-300">
            {/* Tick Mark */}
            <line 
              x1={point.x} y1={centerY - 6} 
              x2={point.x} y2={centerY + 6} 
              stroke="white" strokeWidth="2" strokeOpacity="0.8" 
            />
            {/* Label Case */}
            <rect 
              x={point.x - 10} y={centerY + 16} 
              width="20" height="20" 
              rx="4" 
              fill="#1e293b" 
              stroke="white" 
              strokeOpacity="0.2"
            />
            <text 
              x={point.x} y={centerY + 30} 
              textAnchor="middle" 
              fill="white" 
              fontSize="11" fontWeight="900"
              className="font-mono"
            >
              {point.label}
            </text>
          </g>
        ))}

        {/* Stock Price Axis Label */}
        <text 
          x={margin.left + graphWidth / 2} y={height - 10} 
          textAnchor="middle" 
          fill="white" fillOpacity="0.4" 
          fontSize="9" fontWeight="bold"
          className="uppercase tracking-[0.4em]"
        >
          Underlying Price
        </text>
      </svg>
    </div>
  );
};

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>('long-call');
  const [search, setSearch] = useState('');
  const [biasFilter, setBiasFilter] = useState<Bias | 'All'>('All');
  const [riskFilter, setRiskFilter] = useState<'All' | 'Limited' | 'Unlimited'>('All');
  const detailRef = useRef<HTMLDivElement>(null);

  const filteredStrategies = useMemo(() => {
    return ALL_STRATEGIES.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesBias = biasFilter === 'All' || s.bias === biasFilter;
      const matchesRisk = riskFilter === 'All' || 
                        (riskFilter === 'Limited' && s.riskLoss?.toLowerCase().includes('limited')) ||
                        (riskFilter === 'Unlimited' && s.riskLoss?.toLowerCase().includes('unlimited'));
      
      return matchesSearch && matchesBias && matchesRisk;
    });
  }, [search, biasFilter, riskFilter]);

  const selectedStrategy = useMemo(() => 
    ALL_STRATEGIES.find(s => s.id === selectedId) || ALL_STRATEGIES[0]
  , [selectedId]);

  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  const getBiasColor = (bias: Bias) => {
    switch (bias) {
      case Bias.Bullish: return 'text-emerald-400';
      case Bias.Bearish: return 'text-rose-400';
      case Bias.Neutral: return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  const renderGridColumn = (level: Level) => {
    const levelStrategies = filteredStrategies.filter(s => s.level === level);
    const categories = Array.from(new Set(levelStrategies.map(s => s.category)));

    return (
      <div className="flex flex-col gap-8">
        <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          {level}
        </h2>
        
        {categories.length === 0 ? (
          <p className="text-slate-600 text-sm italic">No strategies match your filters.</p>
        ) : categories.map(cat => (
          <div key={`${level}-${cat}`} className="flex flex-col gap-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat}</h3>
            <div className="flex flex-col gap-1">
              {levelStrategies.filter(s => s.category === cat).map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedId(strategy.id)}
                  className={`text-left transition-all duration-300 py-2 flex items-center group relative ${
                    selectedId === strategy.id ? 'translate-x-1' : ''
                  }`}
                >
                  <div className="mr-3 opacity-60 group-hover:opacity-100 scale-75 group-hover:scale-90 transition-all origin-left">
                    <BiasBadge bias={strategy.bias} showLabel={false} />
                  </div>
                  <span className={`text-sm font-bold tracking-tight ${selectedId === strategy.id ? 'text-white' : 'text-slate-400'} group-hover:text-indigo-400 transition-colors`}>
                    {strategy.name}
                  </span>
                  {selectedId === strategy.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute -left-4 w-1 h-4 bg-indigo-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-slate-300 font-mono p-4 md:p-8 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tighter">
                OPTIONS<span className="text-indigo-500">_STRATEGY</span>.DB
              </h1>
              <p className="text-slate-500 text-sm mt-2">Interactive visual reference for derivative trading architectures.</p>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-auto">
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="SEARCH STRATEGIES..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-700"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/30 p-2 rounded-xl border border-slate-800/50">
            {/* Bias Group */}
            <div className="flex flex-wrap items-center gap-1.5 px-2 border-r border-slate-800/50">
              <div className="flex items-center gap-2 pr-3 text-[9px] text-slate-600 font-black tracking-widest uppercase">
                <Filter size={12} /> Bias:
              </div>
              <button
                onClick={() => setBiasFilter('All')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${
                  biasFilter === 'All' 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                ALL
              </button>

              {[
                { type: Bias.Bullish, icon: TrendingUp, label: 'BULLISH' },
                { type: Bias.Bearish, icon: TrendingDown, label: 'BEARISH' },
                { type: Bias.Neutral, icon: ArrowRight, label: 'NEUTRAL' },
                { type: Bias.Complex, icon: Split, label: 'DIRECTIONAL' },
              ].map(f => (
                <button
                  key={f.type}
                  onClick={() => setBiasFilter(f.type)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${
                    biasFilter === f.type 
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <f.icon size={12} strokeWidth={3} />
                  {f.label}
                </button>
              ))}
            </div>

            {/* Risk Group */}
            <div className="flex flex-wrap items-center gap-1.5 px-2">
              <div className="flex items-center gap-2 pr-3 text-[9px] text-slate-600 font-black tracking-widest uppercase">
                <AlertTriangle size={12} /> Risk:
              </div>
              <button
                onClick={() => setRiskFilter('All')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${
                  riskFilter === 'All' 
                    ? 'bg-amber-500 text-slate-900 shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                ANY
              </button>
              {[
                { type: 'Limited' as const, icon: AlertTriangle, label: 'LIMITED RISK', color: 'bg-amber-500 text-slate-900' },
                { type: 'Unlimited' as const, icon: AlertTriangle, label: 'UNLIMITED RISK', color: 'bg-rose-600 text-white' },
              ].map(r => (
                <button
                  key={r.type}
                  onClick={() => setRiskFilter(r.type)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${
                    riskFilter === r.type
                      ? `${r.color} shadow-lg` 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <r.icon size={12} strokeWidth={3} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Global Key */}
        <div className="flex flex-wrap gap-8 text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase border-y border-slate-800/50 py-6 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <BiasBadge bias={Bias.Bearish} showLabel={false} />
            <span>Bearish</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <BiasBadge bias={Bias.Neutral} showLabel={false} />
            <span>Neutral</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <BiasBadge bias={Bias.Complex} showLabel={false} />
            <span>Directional</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <BiasBadge bias={Bias.Bullish} showLabel={false} />
            <span>Bullish</span>
          </div>
          <div className="w-px h-8 bg-slate-800 mx-4 hidden md:block" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
              <AlertTriangle size={12} strokeWidth={3} />
            </div>
            <span>Limited Risk</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white">
              <AlertTriangle size={12} strokeWidth={3} />
            </div>
            <span>Unlimited Risk</span>
          </div>
        </div>

        {/* Strategy Navigator Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {renderGridColumn(Level.Novice)}
          {renderGridColumn(Level.Intermediate)}
          {renderGridColumn(Level.Advanced)}
          {renderGridColumn(Level.Expert)}
        </div>

        {/* Strategy Detail Card */}
        <AnimatePresence mode="wait">
          {selectedStrategy && (
            <motion.div
              ref={detailRef}
              key={selectedStrategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Info Side */}
                <div className="lg:col-span-2 p-6 md:p-8 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-3xl font-bold text-white tracking-tight">{selectedStrategy.name}</h2>
                    <BiasBadge bias={selectedStrategy.bias} />
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold">
                      <AlertTriangle size={12} /> {selectedStrategy.riskLoss}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-bold">
                      <CheckCircle2 size={12} /> {selectedStrategy.riskProfit}
                    </div>
                  </div>

                  {selectedStrategy.alsoKnownAs && (
                    <p className="text-xs text-slate-500 italic">Also known as: {selectedStrategy.alsoKnownAs}</p>
                  )}

                  <div className="space-y-4">
                    <p className="text-slate-300 leading-relaxed max-w-2xl">
                      {selectedStrategy.description}
                    </p>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          <TrendingUp size={10} className="text-indigo-400" />Typical R:R
                        </div>
                        <p className="text-xs font-bold text-white">
                          {selectedStrategy.riskProfit.includes('Unlimited') ? '1 : ∞' : 
                           selectedStrategy.diagramType === 'bull-spread' || selectedStrategy.diagramType === 'bear-spread' ? '1 : 1.5' :
                           selectedStrategy.diagramType === 'iron-condor' ? '1 : 3' :
                           selectedStrategy.diagramType === 'butterfly' ? '3 : 1' : 'Variable'}
                        </p>
                      </div>
                      <div className="space-y-1 border-l border-slate-800/50 pl-4">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          <Minus size={10} className="text-indigo-400" />Theta Decay
                        </div>
                        <p className={`text-xs font-bold ${selectedStrategy.legs.some(l => typeof l !== 'string' && l.action === 'SELL') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {selectedStrategy.legs.some(l => typeof l !== 'string' && l.action === 'SELL') ? 'Positive θ' : 'Negative θ'}
                        </p>
                      </div>
                      <div className="space-y-1 border-l border-slate-800/50 pl-4">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          <AlertTriangle size={10} className="text-indigo-400" />Vega Exposure
                        </div>
                        <p className="text-xs font-bold text-slate-300">
                          {selectedStrategy.diagramType === 'straddle' ? 'High Long' : 
                           selectedStrategy.diagramType === 'iron-condor' ? 'Low Short' : 'Moderate'}
                        </p>
                      </div>
                      <div className="space-y-1 border-l border-slate-800/50 pl-4">
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          <CheckCircle2 size={10} className="text-indigo-400" />Prob. of Profit
                        </div>
                        <p className={`text-xs font-bold ${
                          selectedStrategy.bias === Bias.Neutral && selectedStrategy.legs.some(l => typeof l !== 'string' && l.action === 'SELL') ? 'text-emerald-400' : 
                          selectedStrategy.bias === Bias.Complex ? 'text-amber-400' : 'text-slate-100'
                        }`}>
                          {selectedStrategy.id === 'iron-condor' || selectedStrategy.id === 'covered-call' ? '60-80%' : 
                           selectedStrategy.id === 'long-call' || selectedStrategy.id === 'long-put' ? '30-40%' : '40-60%'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Strategy Architecture</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedStrategy.legs.map((leg, idx) => {
                          if (typeof leg === 'string') {
                            return (
                              <li key={idx} className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/20">
                                  {idx + 1}
                                </span>
                                {leg}
                              </li>
                            );
                          }

                          return (
                            <li key={idx} className="flex flex-col gap-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 group hover:border-indigo-500/30 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="w-5 h-5 flex items-center justify-center rounded bg-indigo-500/10 text-indigo-400 font-black text-[9px] border border-indigo-500/20 shadow-inner">
                                  0{idx + 1}
                                </span>
                                <div className="flex gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest border ${
                                    leg.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    leg.action === 'SELL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  }`}>
                                    {leg.action}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[8px] font-bold border border-slate-700/50">
                                    {leg.type}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                {leg.action === 'OWN' ? (
                                  <span className="text-blue-300">Own {leg.quantity} shares of underlying</span>
                                ) : (
                                  <>
                                    <span className="text-slate-100 group-hover:text-indigo-200">{leg.quantity}x {leg.type}</span>
                                    <span className="text-slate-600 font-bold">@</span>
                                    <span className="text-indigo-400 underline decoration-indigo-500/40 underline-offset-4 decoration-2">{leg.strike}</span>
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Visual Side */}
                <div className="bg-slate-950/50 p-6 md:p-8 flex flex-col items-center justify-center lg:border-l border-slate-800">
                  <div className="w-full space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payoff Architecture</h4>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse delay-100" />
                      </div>
                    </div>
                    <PLDiagram type={selectedStrategy.diagramType} />
                    <div className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
                      Horizontal dashed line represents break-even.<br />
                      Gradient indicates profit (top) and loss (bottom).
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="pt-20 pb-10 text-center border-t border-slate-800/50">
          <div className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase">
            Designed for educational purposes only • Not financial advice • v1.0.4-production
          </div>
        </footer>
      </div>
    </div>
  );
}
