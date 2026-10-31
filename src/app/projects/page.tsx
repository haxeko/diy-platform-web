import type { Metadata } from "next";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getProjects } from "@/lib/content/load";

export const metadata: Metadata = {
  title: "Dự án",
  description: "Các dự án DIY nhà thông minh với ESP32: Matter over Thread, Matter over Wi-Fi, cảm biến, công tắc, relay — kèm firmware nạp ngay trên trình duyệt.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const cards = projects.map(({ slug, title, summary, protocol, chips, difficulty, timeMinutes, accent, icon, featured, firmware }) => ({
    slug,
    title,
    summary,
    protocol,
    chips,
    difficulty,
    timeMinutes,
    accent,
    icon,
    featured,
    firmware,
  }));

  return (
    <Container className="pb-16">
      <PageHeader
        eyebrow="Dự án"
        title="Làm được trong một buổi tối."
        description="Mỗi dự án gồm danh sách linh kiện, sơ đồ nối dây, giải thích hoạt động và firmware sẵn sàng nạp. Chọn theo giao thức hoặc loại chip bạn đang có."
      />
      <ProjectsExplorer projects={cards} />
    </Container>
  );
}
