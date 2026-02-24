import FitParser from 'fit-file-parser';
import pako from 'pako';

export interface FitRecord {
  timestamp: Date;
  heart_rate?: number;
  power?: number;
  cadence?: number;
  distance?: number;
  speed?: number;
}

export interface FitLap {
  start_time: Date;
  timestamp: Date; // end time
  total_timer_time: number;
}

const DEFAULT_BAND_BPM = 4.0;
const DEFAULT_STABLE_SECONDS = 60;
const DEFAULT_TEST_MINUTES = 30;
const DEFAULT_SEGMENT_MINUTES = 10;
const DEFAULT_MIN_POWER_W = 30.0;
const DEFAULT_STOP_POWER_W = 20.0;
const DEFAULT_STOP_GRACE_S = 25;
const DEFAULT_MIN_IN_BAND_PCT = 90.0;

const formatMMSS = (seconds: number): string => {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getElapsedSeconds = (ts: Date, fileStart: Date): number => {
  return (ts.getTime() - fileStart.getTime()) / 1000;
};

export const fitParserService = {
  parseFitFile: async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let arrayBuffer = e.target?.result as ArrayBuffer;
          if (file.name.toLowerCase().endsWith('.gz')) {
            const uint8Array = new Uint8Array(arrayBuffer);
            arrayBuffer = pako.ungzip(uint8Array).buffer;
          }
          const fitParser = new FitParser({
            force: true,
            speedUnit: 'm/s',
            lengthUnit: 'm',
            temperatureUnit: 'celsius',
            elapsedRecordField: true,
          });
          fitParser.parse(arrayBuffer, (error, data) => {
            if (error) reject(error);
            else resolve(data);
          });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  analyzeTreadmillRun: (fitData: any, fileName: string) => {
    const records: FitRecord[] = fitData.records || [];
    const laps: FitLap[] = fitData.laps || [];
    if (records.length === 0) throw new Error("No record data found in FIT.");
    if (laps.length < 3) throw new Error("Not enough lap markers found. Need lap presses for the 3 test miles.");

    const testLaps = laps.slice(-3);
    const fileStart = records[0].timestamp;

    const miles = testLaps.map((lap, i) => {
      const start = new Date(lap.start_time);
      const end = new Date(lap.timestamp);
      const segRecords = records.filter(r => r.timestamp >= start && r.timestamp <= end);
      const hrValues = segRecords.map(r => r.heart_rate).filter((v): v is number => v !== undefined);
      const hrAvg = hrValues.length > 0 ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : null;
      const splitSec = (end.getTime() - start.getTime()) / 1000;

      return {
        mile_index: i + 1,
        start_ts: start.toISOString(),
        end_ts: end.toISOString(),
        split_time_sec: splitSec,
        split_time_mmss: formatMMSS(splitSec),
        hr_avg: hrAvg,
      };
    });

    return {
      test_type: "treadmill_run_3mi_lap",
      sport: "run",
      file_name: fileName,
      summary: {
        hr_drift_m1_to_m3: (miles[2].hr_avg && miles[0].hr_avg) ? miles[2].hr_avg - miles[0].hr_avg : null,
      },
      data: miles
    };
  },

  analyzeBikeSubmax: (fitData: any, fileName: string, targetHr: number) => {
    const records: FitRecord[] = fitData.records || [];
    if (records.length === 0) throw new Error("No record data found in FIT.");
    
    let startIdx = -1;
    const windowLen = DEFAULT_TEST_MINUTES * 60;

    for (let i = 0; i < records.length; i++) {
      let run = 0;
      let candidateIdx = -1;
      for (let j = i; j < records.length; j++) {
        const r = records[j];
        const hr = r.heart_rate || 0;
        const p = r.power || 0;
        const inBand = hr >= (targetHr - DEFAULT_BAND_BPM) && hr <= (targetHr + DEFAULT_BAND_BPM);
        const pedaling = p >= DEFAULT_MIN_POWER_W;
        if (inBand && pedaling) run++; else break;
        if (run >= DEFAULT_STABLE_SECONDS) {
          candidateIdx = j - DEFAULT_STABLE_SECONDS + 1;
          break;
        }
      }

      if (candidateIdx !== -1) {
        const testEndIdx = candidateIdx + windowLen;
        if (testEndIdx >= records.length) break;
        const seg = records.slice(candidateIdx, testEndIdx);
        let stopRun = 0;
        let stoppedTooLong = false;
        for (const r of seg) {
          if ((r.power || 0) < DEFAULT_STOP_POWER_W) stopRun++; else stopRun = 0;
          if (stopRun >= DEFAULT_STOP_GRACE_S) { stoppedTooLong = true; break; }
        }
        if (stoppedTooLong) { i = candidateIdx + DEFAULT_STABLE_SECONDS; continue; }
        startIdx = candidateIdx;
        break;
      }
    }

    if (startIdx === -1) throw new Error("No valid HR-first 30-min window found.");

    const testRecords = records.slice(startIdx, startIdx + windowLen);
    const segments = [0, 1, 2].map(j => {
      const block = testRecords.slice(j * 600, (j + 1) * 600);
      const hrAvg = block.reduce((a, b) => a + (b.heart_rate || 0), 0) / block.length;
      const pAvg = block.reduce((a, b) => a + (b.power || 0), 0) / block.length;
      return { segment_index: j + 1, hr_avg: hrAvg, power_avg: pAvg, eff: pAvg / hrAvg };
    });

    return {
      test_type: "bike_hr_submax_30min_3x10",
      sport: "bike",
      file_name: fileName,
      summary: {
        eff_change_pct_seg3_vs_seg1: ((segments[2].eff - segments[0].eff) / segments[0].eff) * 100,
        hr_avg: testRecords.reduce((a, b) => a + (b.heart_rate || 0), 0) / testRecords.length,
        power_avg: testRecords.reduce((a, b) => a + (b.power || 0), 0) / testRecords.length,
      },
      data: segments
    };
  }
};
