import { updatePlatformSetting } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getPlatformSettings } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <AdminPage title="Settings" description="Operational platform settings stored as JSON for scheduling, payroll, and support.">
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.id} className="rounded-lg">
            <CardHeader>
              <CardTitle>{setting.setting_key}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updatePlatformSetting} className="grid gap-3">
                <input type="hidden" name="setting_key" value={setting.setting_key} />
                <Textarea
                  name="setting_value"
                  defaultValue={JSON.stringify(setting.setting_value, null, 2)}
                  className="min-h-32 font-mono text-sm"
                />
                <Button type="submit" className="w-fit">Save setting</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
