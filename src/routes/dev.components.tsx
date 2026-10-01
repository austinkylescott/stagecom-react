import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/dev/components')({
  component: DevComponentsPage,
})

function DevComponentsPage() {
  return (
    <main className="page-wrap space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Component baseline
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stock shadcn New York components with the default Neutral light theme.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Semantic tokens from src/styles.css.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {[
            'background',
            'foreground',
            'primary',
            'secondary',
            'muted',
            'accent',
            'border',
            'destructive',
          ].map((token) => (
            <div key={token}>
              <div
                className="h-12 rounded-md border"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <p className="mt-2 text-xs text-muted-foreground">{token}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>
            <Plus />
            Create Event
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Form controls</CardTitle>
            <CardDescription>
              Default sizes, borders and focus states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="example-name">Theater name</Label>
              <Input id="example-name" placeholder="Theater name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="example-type">Event type</Label>
              <NativeSelect id="example-type">
                <NativeSelectOption>Performance</NativeSelectOption>
                <NativeSelectOption>Workshop</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="example-description">Description</Label>
              <Textarea
                id="example-description"
                placeholder="Describe this Event"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
            <CardDescription>
              A standard table with role badges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Olivia', 'Owner'],
                  ['Morgan', 'Member'],
                ].map(([name, role]) => (
                  <TableRow key={name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
