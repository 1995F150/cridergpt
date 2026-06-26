import { useEffect, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, formatCurrency } from "@/utils/pdfExport";
import { FileText, Plus, Trash2, Download, DollarSign } from "lucide-react";

interface Loan {
  id: string;
  invoice_number: string;
  borrower_name: string;
  borrower_contact: string | null;
  principal: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  status: string;
  notes: string | null;
  amount_paid: number;
  created_at: string;
}

function calcLoan(principal: number, ratePct: number, months: number) {
  const r = ratePct / 100 / 12;
  const n = months;
  const monthly = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = monthly * n;
  const interest = total - principal;
  return { monthly, total, interest };
}

export default function LoanTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("25");
  const [term, setTerm] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const preview = principal ? calcLoan(parseFloat(principal) || 0, parseFloat(rate) || 0, parseInt(term) || 1) : null;

  const load = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("personal_loans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      return;
    }
    setLoans(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const createLoan = async () => {
    if (!user) return;
    if (!name || !principal) {
      toast({ title: "Missing info", description: "Borrower name and principal required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("personal_loans")
      .insert({
        owner_id: user.id,
        borrower_name: name,
        borrower_contact: contact || null,
        principal: parseFloat(principal),
        interest_rate: parseFloat(rate) || 25,
        term_months: parseInt(term) || 12,
        start_date: startDate,
        notes: notes || null,
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Loan recorded", description: `Invoice ${data.invoice_number} created.` });
    setName(""); setContact(""); setPrincipal(""); setNotes("");
    load();
    // auto-generate invoice
    generateInvoice(data);
  };

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from("personal_loans").update({ status }).eq("id", id);
    load();
  };

  const deleteLoan = async (id: string) => {
    if (!confirm("Delete this loan record?")) return;
    await (supabase as any).from("personal_loans").delete().eq("id", id);
    load();
  };

  const generateInvoice = (loan: Loan) => {
    const calc = calcLoan(loan.principal, loan.interest_rate, loan.term_months);
    const dueDate = new Date(loan.start_date);
    dueDate.setMonth(dueDate.getMonth() + loan.term_months);

    exportToPDF({
      title: `Loan Invoice ${loan.invoice_number}`,
      module: "Crider Personal Loan",
      data: {
        "Invoice #": loan.invoice_number,
        "Issued To": loan.borrower_name,
        "Contact": loan.borrower_contact || "—",
        "Issue Date": loan.start_date,
        "Due By": dueDate.toISOString().slice(0, 10),
        "Lender": "Jessie Crider / CriderGPT",
      },
      calculations: {
        "Principal Loaned": formatCurrency(loan.principal),
        "Interest Rate (APR)": `${loan.interest_rate}%`,
        "Term": `${loan.term_months} months`,
        "Monthly Payment": formatCurrency(calc.monthly),
        "Total Interest": formatCurrency(calc.interest),
        "Total Repayment Due": formatCurrency(calc.total),
      },
      recommendations: [
        `Payments are due monthly starting ${loan.start_date}.`,
        `Full balance must be paid by ${dueDate.toISOString().slice(0, 10)}.`,
        "Late payments may incur additional interest at the lender's discretion.",
        "Keep this invoice for your records. Contact Jessie Crider for any questions.",
      ],
    });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-primary" />
              Personal Loan Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record money you've loaned out. Default rate is 25% APR. An invoice PDF is auto-generated for each new loan.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Loan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Borrower Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label>Contact (phone/email)</Label>
                  <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="555-1234" />
                </div>
                <div>
                  <Label>Principal ($) *</Label>
                  <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="500" />
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div>
                  <Label>Term (months)</Label>
                  <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's it for?" rows={2} />
              </div>

              {preview && (
                <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-2 text-sm">
                  <div><div className="text-muted-foreground">Monthly</div><div className="font-bold">{formatCurrency(preview.monthly)}</div></div>
                  <div><div className="text-muted-foreground">Total Interest</div><div className="font-bold">{formatCurrency(preview.interest)}</div></div>
                  <div><div className="text-muted-foreground">Total Due</div><div className="font-bold">{formatCurrency(preview.total)}</div></div>
                </div>
              )}

              <Button onClick={createLoan} disabled={loading} className="w-full">
                {loading ? "Saving..." : "Record Loan & Generate Invoice"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Loans ({loans.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loans.length === 0 && <p className="text-sm text-muted-foreground">No loans recorded yet.</p>}
              {loans.map((loan) => {
                const calc = calcLoan(Number(loan.principal), Number(loan.interest_rate), loan.term_months);
                return (
                  <div key={loan.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {loan.borrower_name}
                          <Badge variant={loan.status === "paid" ? "default" : loan.status === "overdue" ? "destructive" : "secondary"}>
                            {loan.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{loan.invoice_number} · started {loan.start_date}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => generateInvoice(loan)}>
                          <Download className="w-4 h-4 mr-1" /> Invoice
                        </Button>
                        {loan.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(loan.id, "paid")}>
                            Mark Paid
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteLoan(loan.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Principal:</span> {formatCurrency(Number(loan.principal))}</div>
                      <div><span className="text-muted-foreground">Rate:</span> {loan.interest_rate}%</div>
                      <div><span className="text-muted-foreground">Monthly:</span> {formatCurrency(calc.monthly)}</div>
                      <div><span className="text-muted-foreground">Total Due:</span> {formatCurrency(calc.total)}</div>
                    </div>
                    {loan.notes && <div className="text-xs text-muted-foreground italic">{loan.notes}</div>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
