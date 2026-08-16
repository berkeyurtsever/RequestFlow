using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RequestFlow.Api.Data;

public sealed class AppDbContextFactory :
    IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=requestflow.design.db")
            .Options;

        return new AppDbContext(options);
    }
}
