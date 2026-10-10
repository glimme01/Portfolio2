// src/tools/GradesTool.jsx
// Noten-Schnitt-Rechner mit 2 Tabs: "DURCHSCHNITT" und "WAS BRAUCHE ICH?", localStorage-State & Ampel

import React, { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconGrades, IconPlus, IconTrash } from '../components/Icons';

export default function GradesTool() {
  usePageMeta(
    'Noten-Schnitt-Rechner',
    'Berechne deinen exakten Notenschnitt mit Gewichtung oder ermittle mit der Zielrechnung die nötige Note für deine nächste Klausur.'
  );

  const [activeTab, setActiveTab] = useState('DURCHSCHNITT'); // 'DURCHSCHNITT' | 'ZIEL'

  // Gespeicherte Noten aus localStorage
  const [gradesList, setGradesList] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_grades_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('localStorage Noten Fehler', e);
    }
    return [
      { id: '1', grade: 2.0, weight: 1, name: 'Kurzarbeit 1' },
      { id: '2', grade: 1.5, weight: 2, name: 'Schulaufgabe 1' },
      { id: '3', grade: 3.0, weight: 1, name: 'Stegreifaufgabe' },
    ];
  });

  // State für neue Noteneingabe
  const [selectedGrade, setSelectedGrade] = useState(2.0);
  const [customGradeInput, setCustomGradeInput] = useState('2.0');
  const [selectedWeight, setSelectedWeight] = useState(1);
  const [gradeName, setGradeName] = useState('');

  // State für Tab B (Was brauche ich?)
  const [targetState, setTargetState] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_grade_target');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('localStorage Ziel Fehler', e);
    }
    return {
      currentAvg: '2.8',
      countExams: '3',
      nextWeight: '2',
      targetAvg: '2.4',
    };
  });

  // Speichern in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mf_tools_grades_list', JSON.stringify(gradesList));
    } catch (e) {
      console.warn(e);
    }
  }, [gradesList]);

  useEffect(() => {
    try {
      localStorage.setItem('mf_tools_grade_target', JSON.stringify(targetState));
    } catch (e) {
      console.warn(e);
    }
  }, [targetState]);

  // Note hinzufügen
  const handleAddGrade = (e) => {
    e.preventDefault();
    const gVal = parseFloat(customGradeInput.replace(',', '.'));
    if (isNaN(gVal) || gVal < 0.75 || gVal > 6.0) return;

    const newEntry = {
      id: Date.now().toString(),
      grade: Math.round(gVal * 100) / 100,
      weight: parseFloat(selectedWeight) || 1,
      name: gradeName.trim() || `Note ${gradesList.length + 1}`,
    };

    setGradesList((prev) => [...prev, newEntry]);
    setGradeName('');
  };

  const handleRemoveGrade = (id) => {
    setGradesList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Möchtest du wirklich alle eingetragenen Noten löschen?')) {
      setGradesList([]);
    }
  };

  // Durchschnitt Tab A
  const averageData = useMemo(() => {
    if (gradesList.length === 0) return { avg: null, totalWeight: 0, count: 0 };
    let sum = 0;
    let totalW = 0;
    gradesList.forEach((g) => {
      sum += g.grade * g.weight;
      totalW += g.weight;
    });
    const avg = totalW > 0 ? sum / totalW : 0;
    return {
      avg: Math.round(avg * 10) / 10,
      exactAvg: avg.toFixed(2),
      totalWeight: totalW,
      count: gradesList.length,
    };
  }, [gradesList]);

  // Tab B: Berechnung "Was brauche ich?"
  const targetResult = useMemo(() => {
    const curAvg = parseFloat(targetState.currentAvg.replace(',', '.'));
    const n = parseFloat(targetState.countExams.replace(',', '.'));
    const w = parseFloat(targetState.nextWeight.replace(',', '.'));
    const target = parseFloat(targetState.targetAvg.replace(',', '.'));

    if (isNaN(curAvg) || isNaN(n) || isNaN(w) || isNaN(target) || n <= 0 || w <= 0) {
      return null;
    }

    // Formel: target = (curAvg * n + needed * w) / (n + w)
    // => needed * w = target * (n + w) - curAvg * n
    // => needed = (target * (n + w) - curAvg * n) / w
    const needed = (target * (n + w) - curAvg * n) / w;
    const rounded = Math.round(needed * 10) / 10;

    let status = 'machbar';
    let assessment = '';
    let color = 'var(--success-green)';
    let isPossible = true;

    if (rounded < 1.0) {
      isPossible = false;
      status = 'unmoeglich';
      color = 'var(--text-muted)';
      assessment = `Mathematisch nicht mehr möglich (erforderlich wäre Note ${rounded.toFixed(1)}, beste Note ist 1,0).`;
    } else if (rounded > 6.0) {
      isPossible = false;
      status = 'unmoeglich';
      color = 'var(--danger-red)';
      assessment = `Ziel liegt unterhalb der schlechtesten Note (6,0) — dein Schnitt ist bereits besser als das Ziel!`;
    } else if (rounded <= 2.5) {
      status = 'locker';
      color = 'var(--success-green)';
      assessment = 'Locker machbar! Mit solider Vorbereitung erreichst du dein Wunschziel problemlos.';
    } else if (rounded <= 4.0) {
      status = 'machbar';
      color = 'var(--warning-amber)';
      assessment = 'Gut machbar! Ein konzentrierter Lerneinsatz reicht vollkommen aus.';
    } else {
      status = 'sportlich';
      color = 'var(--danger-red)';
      assessment = 'Sportlich! Du musst auf die Zähne beißen und eine sehr starke Leistung abliefern.';
    }

    return {
      needed: rounded,
      exactNeeded: needed.toFixed(2),
      isPossible,
      status,
      color,
      assessment,
    };
  }, [targetState]);

  // Schnellauswahl-Notenchips (1.0 bis 6.0)
  const QUICK_GRADES = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0, 6.0];

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconGrades width={28} height={28} />
            </div>
            <div>
              <h1>NOTEN-SCHNITT-RECHNER</h1>
              <p className="tool-page-desc">Durchschnitt mit Gewichtung & Zielberechnung für die nächste Arbeit.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'DURCHSCHNITT' ? 'active' : ''}`}
          onClick={() => setActiveTab('DURCHSCHNITT')}
        >
          DURCHSCHNITT BERECHNEN
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'ZIEL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ZIEL')}
        >
          WAS BRAUCHE ICH? (ZIEL)
        </button>
      </div>

      {activeTab === 'DURCHSCHNITT' ? (
        <div>
          {/* Große Schnitt-Anzeige */}
          <div
            className="card text-center"
            style={{
              marginBottom: '24px',
              backgroundColor: 'var(--bg-subtle)',
              borderWidth: '3px',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              AKTUELLES GESAMTERGEBNIS
            </span>
            <div
              className="font-mono"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                fontWeight: 900,
                color: averageData.avg !== null ? 'var(--accent-orange)' : 'var(--text-muted)',
                lineHeight: 1.1,
                margin: '8px 0',
              }}
            >
              {averageData.avg !== null ? averageData.avg.toFixed(1) : '—'}
            </div>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {averageData.avg !== null
                ? `Exakt: ${averageData.exactAvg} · Aus ${averageData.count} Noten (Gesamtgewicht: ${averageData.totalWeight}x)`
                : 'Trage unten deine ersten Noten ein'}
            </p>
          </div>

          {/* Formular für neue Note */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>NOTE HINZUFÜGEN</h3>

            {/* Schnell-Chips */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                SCHNELLAUSWAHL NOTE
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {QUICK_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`chip ${parseFloat(customGradeInput) === g ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedGrade(g);
                      setCustomGradeInput(g.toString());
                    }}
                    style={{ minWidth: '46px', padding: '6px 10px' }}
                  >
                    {g.toFixed(2).replace('.00', '').replace('.25', '¼').replace('.50', '½').replace('.75', '¾')}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddGrade}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="grade-val">Note (z. B. 1, 2.5, 3.25)</label>
                  <input
                    id="grade-val"
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="6.0"
                    value={customGradeInput}
                    onChange={(e) => setCustomGradeInput(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="grade-weight">Gewichtung</label>
                  <select
                    id="grade-weight"
                    value={selectedWeight}
                    onChange={(e) => setSelectedWeight(parseFloat(e.target.value))}
                  >
                    <option value="0.5">0.5x (mündlich / Test)</option>
                    <option value="1">1x (einfach / Kurzarbeit)</option>
                    <option value="2">2x (doppelt / Schulaufgabe)</option>
                    <option value="3">3x (dreifach)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="grade-name">Bezeichnung (optional)</label>
                <input
                  id="grade-name"
                  type="text"
                  placeholder="z. B. Mathe Schulaufgabe 1"
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <IconPlus width={18} height={18} />
                NOTE EINTRAGEN
              </button>
            </form>
          </div>

          {/* Eingetragene Noten-Liste */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>EINGETRAGENE NOTEN ({gradesList.length})</h3>
              {gradesList.length > 0 && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={handleClearAll}>
                  <IconTrash width={14} height={14} />
                  ALLE LÖSCHEN
                </button>
              )}
            </div>

            {gradesList.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '24px' }}>
                Noch keine Noten eingetragen.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gradesList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: 'var(--border-width-sm) solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            item.grade <= 2.0
                              ? 'var(--success-green-light)'
                              : item.grade <= 3.5
                              ? 'var(--marker-yellow-light)'
                              : 'var(--danger-red-light)',
                          fontSize: '1rem',
                          minWidth: '40px',
                          textAlign: 'center',
                        }}
                      >
                        {item.grade.toFixed(item.grade % 1 === 0 ? 0 : 2)}
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '8px' }}>
                          Gewichtung: {item.weight}x
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRemoveGrade(item.id)}
                      style={{ padding: '4px 8px', minHeight: '32px' }}
                      title="Diese Note löschen"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab B: WAS BRAUCHE ICH? */
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>ZIELRECHNER FÜR DIE NÄCHSTE KLAUSUR</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
            Finde heraus, welche Note du in der nächsten Prüfung schreiben musst, um deinen Wunschschnitt zu erreichen.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="target-cur-avg">Bisheriger Schnitt</label>
              <input
                id="target-cur-avg"
                type="number"
                step="0.05"
                min="1"
                max="6"
                value={targetState.currentAvg}
                onChange={(e) => setTargetState({ ...targetState, currentAvg: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="target-count">Anzahl bisheriger Noten</label>
              <input
                id="target-count"
                type="number"
                min="1"
                max="50"
                value={targetState.countExams}
                onChange={(e) => setTargetState({ ...targetState, countExams: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="target-next-weight">Gewicht nächste Arbeit</label>
              <select
                id="target-next-weight"
                value={targetState.nextWeight}
                onChange={(e) => setTargetState({ ...targetState, nextWeight: e.target.value })}
              >
                <option value="1">1x (normale Arbeit)</option>
                <option value="2">2x (Schulaufgabe / Klausur)</option>
                <option value="3">3x (große Prüfungsarbeit)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="target-wanted-avg">Wunsch-Schnitt (Ziel)</label>
              <input
                id="target-wanted-avg"
                type="number"
                step="0.05"
                min="1"
                max="6"
                value={targetState.targetAvg}
                onChange={(e) => setTargetState({ ...targetState, targetAvg: e.target.value })}
              />
            </div>
          </div>

          <hr className="dashed-divider" />

          {/* Ergebnis-Panel mit Ampel */}
          {targetResult && (
            <div
              className="panel text-center"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
                padding: '24px',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                ERFORDERLICHE NOTE IN DER NÄCHSTEN ARBEIT
              </span>

              <div
                className="font-mono"
                style={{
                  fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                  fontWeight: 900,
                  color: targetResult.color,
                  lineHeight: 1.1,
                  margin: '8px 0',
                }}
              >
                {targetResult.isPossible ? targetResult.needed.toFixed(1) : 'Nicht möglich'}
              </div>

              {targetResult.isPossible && (
                <div style={{ display: 'inline-block', marginBottom: '8px' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: targetResult.color,
                      color: targetResult.status === 'machbar' ? '#111' : '#fff',
                      fontSize: '0.85rem',
                    }}
                  >
                    STATUS: {targetResult.status.toUpperCase()}
                  </span>
                </div>
              )}

              <p style={{ marginTop: '8px', fontSize: '0.95rem', fontWeight: 500 }}>
                {targetResult.assessment}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
