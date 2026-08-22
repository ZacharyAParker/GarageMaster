import {  useEffect, useRef, useState  } from "react";
import { backup } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download, Upload, HardDrive, Trash2, RefreshCw, ShieldAlert,
  FileJson, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

const STORAGE_KEY = "garagemaster_data_v1";

export default function DataManagement() {
  const fileInputRef = useRef(null);
  const [storageUsage, setStorageUsage] = useState(null); // formatted KB string
  const [pendingRestore, setPendingRestore] = useState(null); // { name, text, counts }
  const [restoreResult, setRestoreResult] = useState(null); // counts object after restore
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

  /** Storage estimate: character length of the raw localStorage item, in KB. */
  const refreshUsage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const size = (JSON.stringify(raw ?? "") || "").length;
      setStorageUsage(`${(size / 1024).toFixed(1)} KB`);
    } catch {
      setStorageUsage("-");
    }
  };

  useEffect(() => {
    refreshUsage();
  }, []);

  // After a successful restore the session is cleared - reload shortly after so
  // the app lands on a clean state (login screen), but let the user read counts.
  useEffect(() => {
    if (!restoreResult) return undefined;
    const t = setTimeout(() => window.location.reload(), 6000);
    return () => clearTimeout(t);
  }, [restoreResult]);

  const handleExport = async () => {
    setError("");
    setBusy(true);
    try {
      await backup.downloadBackup();
    } catch (err) {
      setError(err?.message || "Failed to generate backup");
    }
    setBusy(false);
  };

  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Parse up-front so the confirm step can show what will be restored.
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.data || !parsed.data.entities) throw new Error("Invalid backup file");
      const counts = {};
      for (const [name, arr] of Object.entries(parsed.data.entities)) {
        counts[name] = Array.isArray(arr) ? arr.length : 0;
      }
      setPendingRestore({ name: file.name, text, counts });
    } catch (err) {
      setError(err?.message?.includes("Invalid") ? "That file is not a valid GarageMaster backup." : "Could not read that file as JSON.");
    }
    // Allow re-selecting the same file later
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const performRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    setError("");
    try {
      const result = await backup.restore(pendingRestore.text);
      setRestoreResult(result?.counts || {});
      setPendingRestore(null);
      // Restore clears the signed-in session; reload shortly so the app lands on login.
      window.location.reload();
    } catch (err) {
      setError(err?.message || "Failed to restore backup");
    }
    setBusy(false);
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const totalCounts = (counts) => Object.values(counts || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Backup */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-orange-500" />
            Backup &amp; Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div>
              <p className="font-medium text-slate-200">Export Backup</p>
              <p className="text-sm text-slate-500 mt-1">
                Downloads a JSON snapshot of all shop data. Password credentials are excluded from user records.
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={busy}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 whitespace-nowrap"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {busy ? "Preparing..." : "Export Backup"}
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div>
              <p className="font-medium text-slate-200">Restore</p>
              <p className="text-sm text-slate-500 mt-1">
                Replaces ALL current data with a backup file (.json). You&apos;ll be asked to confirm before anything changes.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="restore-file-input"
            />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Backup File
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {restoreResult && (
            <Alert className="bg-emerald-900/20 border-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <AlertTitle className="text-emerald-300">Restore complete</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(restoreResult).map(([name, count]) => (
                    <Badge key={name} className="bg-slate-900 text-emerald-300 border-emerald-800">
                      {name}: {count}
                    </Badge>
                  ))}
                  {Object.keys(restoreResult).length === 0 && (
                    <span className="text-sm text-emerald-200">No records were found in the backup.</span>
                  )}
                </div>
                <p className="text-xs text-emerald-200/70">
                  {totalCounts(restoreResult)} total record{totalCounts(restoreResult) === 1 ? "" : "s"} restored. All users must sign in again - reloading in a moment...
                </p>
                <Button
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  Reload Now
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Storage usage */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-orange-500" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Estimated local storage used by GarageMaster data</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{storageUsage ?? "…"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshUsage}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-slate-900 border-red-800">
        <CardHeader className="border-b border-red-900/60">
          <CardTitle className="text-lg text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Resetting permanently erases <span className="text-red-300 font-medium">all locally stored data</span> - users, jobs,
            customers, invoices, settings, everything. This cannot be undone. Consider exporting a backup first.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-slate-300">Type <span className="font-mono text-red-400">RESET</span> to enable</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                className={`bg-slate-800 border-slate-700 text-slate-200 font-mono ${confirmText && confirmText !== "RESET" ? "border-red-700 focus-visible:ring-red-700" : ""}`}
              />
            </div>
            <Button
              onClick={resetAllData}
              disabled={confirmText !== "RESET"}
              className="bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore confirmation dialog */}
      <AlertDialog open={!!pendingRestore} onOpenChange={(open) => !open && setPendingRestore(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-slate-400">
                <p>
                  Restoring <span className="text-slate-200 font-medium">{pendingRestore?.name}</span> replaces every entity in the
                  current database. Existing data not present in the backup will be lost.
                </p>
                {pendingRestore && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(pendingRestore.counts).map(([name, count]) => (
                      <Badge key={name} className="bg-slate-800 text-slate-300 border-slate-700">
                        {name}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs">You will be signed out after the restore completes.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent Radix from closing before the async work reports back
                e.preventDefault();
                performRestore();
              }}
              disabled={busy}
              className="bg-orange-600 text-white hover:bg-orange-500"
            >
              {busy ? "Restoring..." : "Yes, Restore Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
