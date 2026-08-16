using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RequestFlow.Api.Models;

namespace RequestFlow.Api.Data;

public static class RequestContentSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await SeedKnowledgeArticlesAsync(context);
        await SeedTemplatesAsync(context);
        await SeedCategoryFieldsAsync(context);
    }

    private static async Task SeedKnowledgeArticlesAsync(
        AppDbContext context
    )
    {
        if (await context.KnowledgeArticles.AnyAsync())
        {
            return;
        }

        var articles = new[]
        {
            Guide(
                "How to create an effective request",
                "Getting Started",
                "Choose the closest category, use a clear title and include the business impact, location and required date.",
                "Start with a short title that describes the outcome you need. Select the category that best matches the request so it reaches the right team. In the description, explain what is needed, who is affected, the desired date and any troubleshooting already completed. Attach supporting files when they make the request easier to understand.",
                "create request title category priority attachment",
                10
            ),
            Guide(
                "Understanding request priorities",
                "Request Management",
                "Use priority levels consistently so urgent work remains visible and response targets stay meaningful.",
                "Low is for work that can wait several business days. Medium is the normal choice for standard requests. High is for important work that affects daily operations. Urgent should be reserved for critical issues that prevent normal work or create a serious operational risk.",
                "priority urgent high medium low sla",
                20
            ),
            Guide(
                "Track status, comments and attachments",
                "Request Management",
                "Follow progress from the request details page and keep all request-related communication in one place.",
                "Open the request from All Requests or Assigned Tasks. The status shows the current workflow stage. Use comments to add context or answer questions, and attachments to share supporting documents. Activity history records important changes so everyone can see what happened and when.",
                "status comments attachments activity tracking",
                30
            ),
            Guide(
                "Account and access request checklist",
                "IT Support",
                "Include the system, required access level, business reason and approver to reduce follow-up questions.",
                "For an access request, provide the application or system name, the access level or role required, the employee who needs access, the business justification and the approving manager. Never include passwords, private keys or authentication codes in a request.",
                "account access permission role security password",
                40
            ),
            Faq(
                "Can I edit a request after submitting it?",
                "Requests",
                "Yes. Open the request and use Edit Request. Your changes are saved automatically after the required information is valid.",
                100
            ),
            Faq(
                "What happens when a request is overdue?",
                "SLA",
                "The request is marked as overdue, relevant users receive a notification and the event is recorded for management reporting.",
                110
            ),
            Faq(
                "Who can see my request?",
                "Privacy and Access",
                "You can see requests you created. Assigned staff can see their assigned work, while supervisors and administrators can manage the wider request queue.",
                120
            ),
            Faq(
                "Can I attach documents or screenshots?",
                "Attachments",
                "Yes. Add supported files while creating the request or from the request details page. Do not upload passwords, secret keys or sensitive personal data unless your company process explicitly requires it.",
                130
            )
        };

        await context.KnowledgeArticles.AddRangeAsync(articles);
        await context.SaveChangesAsync();
    }

    private static async Task SeedTemplatesAsync(
        AppDbContext context
    )
    {
        if (await context.RequestTemplates.AnyAsync())
        {
            return;
        }

        var templates = new[]
        {
            Template(
                "New computer setup",
                "Hardware Request",
                "New computer setup for [employee]",
                "Please prepare a computer for the employee below. Include the required accessories, standard company applications and access setup.",
                "High",
                "laptop",
                10
            ),
            Template(
                "Software access",
                "Software Request",
                "Access request for [software]",
                "Please provide access to the specified software. The business reason, required license and expected usage are included below.",
                "Medium",
                "key-round",
                20
            ),
            Template(
                "Annual leave",
                "Leave Request",
                "Annual leave request",
                "I would like to request annual leave for the dates provided below. Handover and backup contact details are included.",
                "Medium",
                "calendar-days",
                30
            ),
            Template(
                "Expense reimbursement",
                "Reimbursement Request",
                "Expense reimbursement request",
                "Please review and reimburse the business expense described below. Supporting receipts will be attached to the request.",
                "Medium",
                "receipt-text",
                40
            ),
            Template(
                "Office supplies order",
                "Office Supplies",
                "Office supplies request",
                "Please provide the office supplies listed below and deliver them to the specified location.",
                "Low",
                "package-plus",
                50
            ),
            Template(
                "Visitor registration",
                "Visitor Registration",
                "Visitor registration request",
                "Please register the visitor using the details below and notify reception before the planned arrival.",
                "Medium",
                "contact-round",
                60
            )
        };

        await context.RequestTemplates.AddRangeAsync(templates);
        await context.SaveChangesAsync();
    }

    private static async Task SeedCategoryFieldsAsync(
        AppDbContext context
    )
    {
        if (await context.CategoryFields.AnyAsync())
        {
            return;
        }

        var fields = new[]
        {
            Field("Hardware Request", "deviceType", "Device type", "select", true, "Select the required device", "Choose the main device needed.", ["Laptop", "Desktop", "Monitor", "Mobile device", "Accessory"], 10),
            Field("Hardware Request", "operatingSystem", "Operating system", "select", false, "Select an operating system", "Leave blank when the standard company image is suitable.", ["Windows", "macOS", "Linux", "Standard company image"], 20),
            Field("Hardware Request", "neededBy", "Required date", "date", true, "", "Select the date the equipment should be ready.", [], 30),

            Field("Software Request", "softwareName", "Software name", "text", true, "Example: Figma, Microsoft Visio", "Use the official product name when possible.", [], 10),
            Field("Software Request", "licenseType", "License type", "select", true, "Select a license type", "Choose the closest option.", ["New license", "Existing license access", "Trial", "Not sure"], 20),
            Field("Software Request", "businessJustification", "Business justification", "textarea", true, "Explain why the software is needed", "Describe the task or project that requires this software.", [], 30),

            Field("Leave Request", "startDate", "Leave start date", "date", true, "", "First day of leave.", [], 10),
            Field("Leave Request", "endDate", "Leave end date", "date", true, "", "Last day of leave.", [], 20),
            Field("Leave Request", "backupContact", "Backup contact", "text", true, "Colleague covering your work", "Provide the person who will handle urgent work during your leave.", [], 30),

            Field("Reimbursement Request", "amount", "Expense amount", "number", true, "0.00", "Enter the amount shown on the receipt.", [], 10),
            Field("Reimbursement Request", "expenseDate", "Expense date", "date", true, "", "Date shown on the receipt.", [], 20),
            Field("Reimbursement Request", "costCenter", "Cost center", "text", false, "Example: IT-2026", "Add the cost center when known.", [], 30),

            Field("Office Supplies", "itemList", "Items and quantities", "textarea", true, "Example: 3 notebooks, 2 blue pens", "List every item and the required quantity.", [], 10),
            Field("Office Supplies", "deliveryLocation", "Delivery location", "text", true, "Building, floor or desk", "Provide enough detail for delivery.", [], 20),

            Field("Visitor Registration", "visitorName", "Visitor name", "text", true, "Full name", "Enter the visitor's name as it appears on their identification.", [], 10),
            Field("Visitor Registration", "visitDate", "Visit date", "date", true, "", "Planned arrival date.", [], 20),
            Field("Visitor Registration", "hostName", "Host employee", "text", true, "Employee meeting the visitor", "The host will be contacted when the visitor arrives.", [], 30)
        };

        await context.CategoryFields.AddRangeAsync(fields);
        await context.SaveChangesAsync();
    }

    private static KnowledgeArticle Guide(
        string title,
        string category,
        string summary,
        string content,
        string keywords,
        int order
    ) => new()
    {
        Title = title,
        Category = category,
        ArticleType = "Guide",
        Summary = summary,
        Content = content,
        Keywords = keywords,
        DisplayOrder = order,
        IsPublished = true
    };

    private static KnowledgeArticle Faq(
        string title,
        string category,
        string content,
        int order
    ) => new()
    {
        Title = title,
        Category = category,
        ArticleType = "Faq",
        Summary = content,
        Content = content,
        Keywords = $"faq {category}",
        DisplayOrder = order,
        IsPublished = true
    };

    private static RequestTemplate Template(
        string name,
        string category,
        string title,
        string description,
        string priority,
        string icon,
        int order
    ) => new()
    {
        Name = name,
        Category = category,
        Title = title,
        Description = description,
        Priority = priority,
        Icon = icon,
        DisplayOrder = order,
        IsActive = true
    };

    private static CategoryField Field(
        string category,
        string key,
        string label,
        string type,
        bool isRequired,
        string placeholder,
        string helpText,
        string[] options,
        int order
    ) => new()
    {
        Category = category,
        Key = key,
        Label = label,
        FieldType = type,
        IsRequired = isRequired,
        Placeholder = placeholder,
        HelpText = helpText,
        OptionsJson = JsonSerializer.Serialize(options),
        DisplayOrder = order,
        IsActive = true
    };
}
