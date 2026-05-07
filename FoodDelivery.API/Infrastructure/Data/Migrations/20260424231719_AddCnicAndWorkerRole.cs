using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCnicAndWorkerRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cnic",
                table: "Users",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                columns: new[] { "Cnic", "PasswordHash" },
                values: new object[] { "", "$2a$11$gEf/d0st8YMwhQLRA4AcGO0rpW4/YU9zZS.tVQ.EMw0bzdmpwA102" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cnic",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                column: "PasswordHash",
                value: "$2a$11$jayqeqCyt30X4.yT8JK7tu3tal0sPcK6nSjL0kjO.79iTbWKeKC.K");
        }
    }
}
