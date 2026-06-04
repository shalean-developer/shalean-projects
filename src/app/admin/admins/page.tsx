import { Mail } from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdmins } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const admins = await getAdmins();

  return (
    <AdminPage
      eyebrow="Team access"
      title="Admins"
      description="Admin users and team permission levels."
    >
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Team members</CardTitle>
            <Badge variant="secondary">{admins.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.permission_level}</TableCell>
                    <TableCell>
                      <Badge
                        variant={admin.status === "Active" ? "secondary" : "outline"}
                      >
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`mailto:${admin.email}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "icon",
                        })}
                        aria-label={`Email ${admin.full_name}`}
                      >
                        <Mail className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {!admins.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No admin team profiles found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
