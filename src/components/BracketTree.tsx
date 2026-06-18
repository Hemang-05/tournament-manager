'use client';

import React from 'react';
import { Edit2, CheckCircle2 } from 'lucide-react';
import { getTeamPlaceholder } from '@/lib/bracket';

interface BracketMatch {
  id: string;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team?: { name: string; logo_url: string | null } | null;
  away_team?: { name: string; logo_url: string | null } | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  placeholder_home?: string | null;
  placeholder_away?: string | null;
}

interface BracketTreeProps {
  matches: BracketMatch[];
  onMatchClick?: (match: BracketMatch) => void;
  isAdmin?: boolean;
}

export default function BracketTree({ matches, onMatchClick, isAdmin = false }: BracketTreeProps) {
  // Group matches by round
  const r16Matches = matches.filter(m => m.stage.toLowerCase().startsWith('round of 16')).sort((a, b) => a.stage.localeCompare(b.stage));
  const qfMatches = matches.filter(m => m.stage.toLowerCase().startsWith('quarter-final')).sort((a, b) => a.stage.localeCompare(b.stage));
  const sfMatches = matches.filter(m => m.stage.toLowerCase().startsWith('semi-final')).sort((a, b) => a.stage.localeCompare(b.stage));
  const finalMatch = matches.find(m => m.stage.toLowerCase() === 'final') || null;

  const hasR16 = r16Matches.length > 0;
  const hasQF = qfMatches.length > 0 || hasR16;
  const hasSF = sfMatches.length > 0 || hasQF;

  const getTeamName = (team: any, placeholder: string) => {
    return team?.name || placeholder;
  };

  const getMatchWinnerId = (m: BracketMatch) => {
    if (m.status?.toLowerCase() !== 'completed' || m.home_score === null || m.away_score === null) return null;
    if (m.home_score > m.away_score) return m.home_team_id;
    if (m.away_score > m.home_score) return m.away_team_id;
    
    // Shootout resolution check
    if (m.home_penalty_score !== null && m.home_penalty_score !== undefined &&
        m.away_penalty_score !== null && m.away_penalty_score !== undefined) {
      if (m.home_penalty_score > m.away_penalty_score) return m.home_team_id;
      if (m.away_penalty_score > m.home_penalty_score) return m.away_team_id;
    }
    return null; // Draw resolved manually/handled
  };

  const renderMatchCard = (m: BracketMatch, defaultHomePlaceholder: string, defaultAwayPlaceholder: string) => {
    const isCompleted = m.status?.toLowerCase() === 'completed';
    const winnerId = getMatchWinnerId(m);
    const homeWon = winnerId === m.home_team_id && m.home_team_id !== null;
    const awayWon = winnerId === m.away_team_id && m.away_team_id !== null;

    const clickable = isAdmin && onMatchClick;

    return (
      <div
        key={m.id}
        onClick={() => clickable && onMatchClick(m)}
        className={`w-64 bg-white border rounded-xl overflow-hidden shadow-sm transition-all group ${
          clickable ? 'cursor-pointer hover:border-[#00D084] hover:shadow-md' : 'border-gray-200'
        }`}
      >
        {/* Match Card Header */}
        <div className="bg-[#0A1628] px-3 py-1.5 flex justify-between items-center text-[10px] font-bold text-gray-300">
          <span className="truncate">{m.stage}</span>
          {isCompleted ? (
            <span className="text-[#00D084] flex items-center gap-0.5">
              <CheckCircle2 size={10} /> Completed
            </span>
          ) : (
            <span className="text-gray-400">Scheduled</span>
          )}
        </div>

        {/* Team Details */}
        <div className="divide-y divide-gray-100 text-sm">
          {/* Home Team */}
          <div className={`px-3 py-2 flex items-center justify-between font-bold ${
            isCompleted && !homeWon && m.home_team_id ? 'text-gray-400 line-through font-normal' : 'text-gray-800'
          }`}>
            <div className="flex items-center gap-2 max-w-[180px]">
              {m.home_team?.logo_url ? (
                <img src={m.home_team.logo_url} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-gray-400 font-bold border">
                  H
                </span>
              )}
              <span className="truncate text-xs">{getTeamName(m.home_team, defaultHomePlaceholder)}</span>
            </div>
            <span className="font-mono text-xs">
              {m.home_score !== null ? (
                m.home_penalty_score !== null && m.home_penalty_score !== undefined ? (
                  <span>
                    {m.home_score} <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1 py-0.2 rounded">({m.home_penalty_score})</span>
                  </span>
                ) : (
                  m.home_score
                )
              ) : (
                '-'
              )}
            </span>
          </div>

          {/* Away Team */}
          <div className={`px-3 py-2 flex items-center justify-between font-bold ${
            isCompleted && !awayWon && m.away_team_id ? 'text-gray-400 line-through font-normal' : 'text-gray-800'
          }`}>
            <div className="flex items-center gap-2 max-w-[180px]">
              {m.away_team?.logo_url ? (
                <img src={m.away_team.logo_url} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-gray-400 font-bold border">
                  A
                </span>
              )}
              <span className="truncate text-xs">{getTeamName(m.away_team, defaultAwayPlaceholder)}</span>
            </div>
            <span className="font-mono text-xs">
              {m.away_score !== null ? (
                m.away_penalty_score !== null && m.away_penalty_score !== undefined ? (
                  <span>
                    {m.away_score} <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1 py-0.2 rounded">({m.away_penalty_score})</span>
                  </span>
                ) : (
                  m.away_score
                )
              ) : (
                '-'
              )}
            </span>
          </div>
        </div>

        {/* Hover Click overlay */}
        {clickable && (
          <div className="bg-[#00D084]/5 border-t border-[#00D084]/10 px-3 py-1 text-[10px] text-[#00B875] font-bold hidden group-hover:flex items-center justify-center gap-1">
            <Edit2 size={10} /> Edit / Log Result
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center py-8 bg-slate-50 border border-gray-200 rounded-2xl shadow-inner min-h-[500px] overflow-x-auto px-6">
      <div className="flex items-center gap-12">
        {/* Round of 16 */}
        {hasR16 && (
          <div className="flex flex-col gap-6 justify-center">
            <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Round of 16</div>
            {r16Matches.map((m, i) => renderMatchCard(m, `Team ${i*2+1}`, `Team ${i*2+2}`))}
          </div>
        )}

        {/* Quarter-finals */}
        {hasQF && (
          <div className="flex flex-col gap-12 justify-center">
            <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quarter-finals</div>
            {qfMatches.length > 0 ? (
              qfMatches.map((m, i) => {
                const homeLabel = getTeamPlaceholder(m.stage, 'home', matches, m);
                const awayLabel = getTeamPlaceholder(m.stage, 'away', matches, m);
                return renderMatchCard(m, homeLabel, awayLabel);
              })
            ) : (
              // Placeholder columns
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-64 h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400">
                  QF {i + 1} Placeholder
                </div>
              ))
            )}
          </div>
        )}

        {/* Semi-finals */}
        {hasSF && (
          <div className="flex flex-col gap-24 justify-center">
            <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Semi-finals</div>
            {sfMatches.length > 0 ? (
              sfMatches.map((m, i) => {
                const homeLabel = getTeamPlaceholder(m.stage, 'home', matches, m);
                const awayLabel = getTeamPlaceholder(m.stage, 'away', matches, m);
                return renderMatchCard(m, homeLabel, awayLabel);
              })
            ) : (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="w-64 h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400">
                  SF {i + 1} Placeholder
                </div>
              ))
            )}
          </div>
        )}

        {/* Final */}
        <div className="flex flex-col gap-6 justify-center">
          <div className="text-center text-xs font-bold text-[#00D084] uppercase tracking-wider mb-2">Championship Final</div>
          {finalMatch ? (
            renderMatchCard(finalMatch, 'Winner Semi-final 1', 'Winner Semi-final 2')
          ) : (
            <div className="w-64 h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400">
              Final Placeholder
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
