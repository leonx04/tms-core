import { redirect } from "next/navigation"

export default function Custom404Page() {
  // Redirect to the not-found page
  redirect("/not-found")
}

