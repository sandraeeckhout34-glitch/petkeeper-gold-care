import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function ConfirmDelete({
  onConfirm,
  title = "Weet je het zeker?",
  description = "Dit item wordt permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.",
  trigger,
}: {
  onConfirm: () => void;
  title?: string;
  description?: string;
  trigger?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}