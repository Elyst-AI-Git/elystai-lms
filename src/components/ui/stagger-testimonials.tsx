"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SQRT_5000 = Math.sqrt(5000);

// Arranged so no two testimonials from the same program are adjacent.
// Sequence by program: Yathra → Circle → Juniors → Circle → Yathra →
//   Juniors → Circle → Yathra → Juniors → Circle → Yathra
const testimonials = [
  {
    tempId: 0,
    testimonial: "AI Yathra broke my brain in 48 Hours. If you're curious about AI but don't know where to start, I highly recommend keeping an eye out for their next event.",
    name: "Rahima SV",
    program: "AI Yathra 2.0"
  },
  {
    tempId: 1,
    testimonial: "What genuinely stood out to me was the mindset of the Elyst AI team, making sure people actually understand how to use them in both their personal and professional lives.",
    name: "Shaheen Raheem",
    program: "Elyst AI Circle"
  },
  {
    tempId: 2,
    testimonial: "He loved creating his own superhero image and even built a simple website using Lovable. Overall, it's a great program that encourages kids to actually build things with AI.",
    name: "Reshmi",
    program: "AI for Juniors Parent"
  },
  {
    tempId: 3,
    testimonial: "That was a really engaging and insightful session, Nihal. I picked up quite a few valuable takeaways. Looking forward to attending more sessions and courses from your team.",
    name: "Basila Fathima",
    program: "Elyst AI Circle"
  },
  {
    tempId: 4,
    testimonial: "Shirin and Nihal didn't just teach Gen AI, automations & AI tools. You guided us how to think, how to approach learning, it didn't feel like a webinar at all.",
    name: "Rohit P",
    program: "AI Yathra"
  },
  {
    tempId: 5,
    testimonial: "I think my son got an idea about the language of future. Prompt Creation, web design using AI are so interesting for students, they can use this type of tools in many situations.",
    name: "Anusha",
    program: "AI for Juniors Parent"
  },
  {
    tempId: 6,
    testimonial: "It was such a great session, where we could clarify all the doubts and learn new things and unlearn old ones.",
    name: "Shiju Roy",
    program: "Elyst AI Circle"
  },
  {
    tempId: 7,
    testimonial: "The hands on approach of showing each things practically, showing how each tool actually works, made the sessions very effective. Looking forward to what's next.",
    name: "Muhammed Sinan B",
    program: "AI Yathra"
  },
  {
    tempId: 8,
    testimonial: "Thank you Elyst AI for your guidance to understand the basics of AI. Prompt Creation, web design using AI are so interesting for basic students. They can use this type of tools in many situations.",
    name: "Parent",
    program: "AI for Juniors"
  },
  {
    tempId: 9,
    testimonial: "The session made Claude feel much easier to explore and actually use in day-to-day work. And Nihal Anas, you did an amazing job taking us through each part patiently.",
    name: "Adeela Thasneem",
    program: "Elyst AI Circle"
  },
  {
    tempId: 10,
    testimonial: "Big shoutout to Nihal Anas and Fathima Shirin from Elyst AI. Your passion to deliver value was obvious throughout the journey. Expecting more sessions like this!",
    name: "Muhammed Rasil N",
    program: "AI Yathra"
  },
];

interface TestimonialCardProps {
  position: number;
  testimonial: typeof testimonials[0];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  position,
  testimonial,
  handleMove,
  cardSize
}) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-[3px] p-8 transition-all duration-500 ease-in-out",
        isCenter
          ? "z-10 bg-primary text-primary-foreground border-primary"
          : "z-0 bg-card text-card-foreground border-border hover:border-primary/50"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px var(--border)" : "0px 0px 0px 0px transparent"
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border"
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2
        }}
      />
      <h3 className={cn(
        "font-medium",
        isCenter ? "text-primary-foreground" : "text-foreground"
      )}
        style={{ fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)", lineHeight: 1.55 }}
      >
        &ldquo;{testimonial.testimonial}&rdquo;
      </h3>
      {/* Attribution — name on line 1, program on line 2, no dash */}
      <div className="absolute bottom-8 left-8 right-8">
        <p className={cn(
          "font-bold not-italic",
          isCenter ? "text-primary-foreground" : "text-foreground"
        )}
          style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)", lineHeight: 1.3 }}
        >
          {testimonial.name}
        </p>
        <p className={cn(
          "mt-0.5 font-normal not-italic",
          isCenter ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
          style={{ fontSize: "clamp(0.82rem, 1vw, 0.92rem)", lineHeight: 1.3 }}
        >
          {testimonial.program}
        </p>
      </div>
    </div>
  );
};

export const StaggerTestimonials: React.FC = () => {
  const [cardSize, setCardSize] = useState(385);
  const [testimonialsList, setTestimonialsList] = useState(testimonials);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 385 : 300);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden bg-muted/30"
      style={{ height: 620 }}
    >
      {testimonialsList.map((testimonial, index) => {
        const position = testimonialsList.length % 2
          ? index - (testimonialsList.length + 1) / 2
          : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
