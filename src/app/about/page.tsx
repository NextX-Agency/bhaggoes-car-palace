import { redirect } from "next/navigation";

// Keep older links working while the contact page carries the location story.
export default function AboutRedirect() {
  redirect("/contact");
}
