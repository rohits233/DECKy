// Extract structured content from documents
export async function parseDocument(fileContent: string, fileName: string): Promise<ParsedContent> {
  const sections: Section[] = [];
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  let currentSection: Section | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers (various patterns)
    const isHeader = 
      trimmed.length > 0 && (
        // All caps
        trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.match(/^\d+$/) ||
        // Ends with colon
        trimmed.endsWith(':') && trimmed.length < 100 ||
        // Numbered headers
        trimmed.match(/^\d+\.\s+[A-Z]/) ||
        // Markdown headers
        trimmed.startsWith('#')
      );
    
    if (isHeader) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed.replace(/^#+\s*/, '').replace(/:\s*$/, '').replace(/^\d+\.\s*/, ''),
        content: [],
        type: detectSectionType(trimmed)
      };
    } else if (currentSection && trimmed.length > 0) {
      currentSection.content.push(trimmed);
    } else if (!currentSection && trimmed.length > 0) {
      // Start a default section if we haven't found a header yet
      currentSection = {
        title: 'Overview',
        content: [trimmed],
        type: 'summary'
      };
    }
  }
  
  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection);
  }
  
  // If no sections found, create one from all content
  if (sections.length === 0 && lines.length > 0) {
    sections.push({
      title: fileName.replace(/\.[^/.]+$/, ''),
      content: lines,
      type: 'content'
    });
  }
  
  return { sections, fileName };
}

function detectSectionType(title: string): SectionType {
  const lower = title.toLowerCase();
  
  if (lower.includes('objective') || lower.includes('goal')) return 'objectives';
  if (lower.includes('timeline') || lower.includes('schedule') || lower.includes('roadmap')) return 'timeline';
  if (lower.includes('budget') || lower.includes('cost') || lower.includes('financial')) return 'budget';
  if (lower.includes('risk') || lower.includes('challenge')) return 'risks';
  if (lower.includes('summary') || lower.includes('overview') || lower.includes('executive')) return 'summary';
  if (lower.includes('outcome') || lower.includes('result') || lower.includes('benefit')) return 'outcomes';
  if (lower.includes('next step') || lower.includes('action')) return 'outcomes';
  
  return 'content';
}

export function generateSlidesFromContent(parsed: ParsedContent): SlideTemplate[] {
  const slides: SlideTemplate[] = [];
  
  // Title slide
  slides.push({
    title: parsed.fileName.replace(/\.[^/.]+$/, '').replace(/-|_/g, ' '),
    content: 'Project Overview\n\nPresented by AI Deck Builder',
    layout: 'title',
    icon: '📊',
    color: 'indigo'
  });
  
  // Generate slides from sections
  parsed.sections.forEach((section) => {
    // Format content with bullet points
    let formattedContent = '';
    
    if (section.content.length > 0) {
      // Group related content
      const bullets = section.content.map(line => {
        // Clean up the line
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        return cleaned;
      }).filter(line => line.length > 0);
      
      // Create bullet points
      if (bullets.length > 0) {
        formattedContent = bullets.slice(0, 6).map(bullet => `• ${bullet}`).join('\n\n');
      }
    }
    
    slides.push({
      title: section.title,
      content: formattedContent || section.content.join('\n\n'),
      layout: getLayoutForType(section.type),
      icon: getIconForType(section.type),
      color: getColorForType(section.type)
    });
  });
  
  return slides;
}

function getLayoutForType(type: SectionType): string {
  const layouts: Record<SectionType, string> = {
    summary: 'title',
    objectives: 'bullets',
    timeline: 'timeline',
    budget: 'numbers',
    risks: 'two-column',
    outcomes: 'bullets',
    content: 'content'
  };
  return layouts[type];
}

function getIconForType(type: SectionType): string {
  const icons: Record<SectionType, string> = {
    summary: '📋',
    objectives: '🎯',
    timeline: '📅',
    budget: '💰',
    risks: '⚠️',
    outcomes: '✅',
    content: '📄'
  };
  return icons[type];
}

function getColorForType(type: SectionType): string {
  const colors: Record<SectionType, string> = {
    summary: 'indigo',
    objectives: 'blue',
    timeline: 'purple',
    budget: 'green',
    risks: 'red',
    outcomes: 'emerald',
    content: 'gray'
  };
  return colors[type];
}

export interface ParsedContent {
  sections: Section[];
  fileName: string;
}

export interface Section {
  title: string;
  content: string[];
  type: SectionType;
}

export type SectionType = 'summary' | 'objectives' | 'timeline' | 'budget' | 'risks' | 'outcomes' | 'content';

export interface SlideTemplate {
  title: string;
  content: string;
  layout: string;
  icon: string;
  color: string;
}
